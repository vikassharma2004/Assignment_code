import mongoose from 'mongoose';
import Enrollment from '../models/Enrollment.js';
import Session from '../models/Session.js';
import User from '../models/User.js';
import Progress from '../models/Progress.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';

// CreateEnrollment
export const createEnrollment = catchAsync(async (req, res, next) => {
  const { paymentMethod = 'self' } = req.body;
  const userId = req.user.userId;

  const activeSession = await Session.findOne({
    status: 'active',
    expiresAt: { $gt: new Date() }
  });

  if (!activeSession) {
    return next(new AppError('No active session available for enrollment.', 503, 'NO_ACTIVE_SESSION'));
  }

  const user = await User.findById(userId);
  if (!user || !user.isProfileComplete) {
    return next(new AppError('Please complete your profile before enrolling', 400, 'INCOMPLETE_PROFILE'));
  }

  const existing = await Enrollment.findOne({ userId, status: 'active', expiresAt: { $gt: new Date() } });
  if (existing) {
    return next(new AppError('You are already enrolled in an active session', 400, 'DUPLICATE_ENROLLMENT'));
  }

  if (activeSession.maxSeats && activeSession.totalEnrolled >= activeSession.maxSeats) {
    return next(new AppError('Session reached max seats', 400, 'SESSION_FULL'));
  }

  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();

  try {
    const enrollmentId = uuidv4();

    const newEnrollment = await Enrollment.create([{
      _id: enrollmentId,
      userId,
      sessionId: activeSession._id,
      paymentMethod,
      paymentStatus: 'paid',
      expiresAt: activeSession.expiresAt
    }], { session: mongoSession });


    activeSession.totalEnrolled += 1;
    await activeSession.save({ session: mongoSession });

    await mongoSession.commitTransaction();
    mongoSession.endSession();

    const jti = uuidv4();
    const payload = {
      userId,
      role: user.role,
      sessionId: activeSession._id,
      enrollmentId,
      jti
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRE });
    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRE });

    res.status(201).json({
      status: 'success',
      data: {
        enrollment: newEnrollment[0],
        accessToken,
        refreshToken,
        message: `Enrolled in '${activeSession.title}'. Session expires at ${activeSession.expiresAt}`
      }
    });

  } catch (error) {
    await mongoSession.abortTransaction();
    mongoSession.endSession();
    return next(new AppError('Transaction failed: ' + error.message, 500, 'TXN_ABORTED'));
  }
});

// GetMyEnrollment
export const getMyEnrollment = catchAsync(async (req, res, next) => {
  const enrollments = await Enrollment.find({ userId: req.user.userId }).sort('-createdAt');
  res.status(200).json({
    status: 'success',
    data: { enrollments }
  });
});
