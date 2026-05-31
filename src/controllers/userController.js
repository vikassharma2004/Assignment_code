import User from '../models/User.js';
import Session from '../models/Session.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
// GetProfile
export const getProfile = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.userId);
  res.status(200).json({ status: 'success', data: { user } });
});

// CompleteProfile
export const completeProfile = catchAsync(async (req, res, next) => {
  const activeSession = await Session.findOne({ status: 'active', expiresAt: { $gt: new Date() } });
  if (!activeSession) {
    return next(new AppError('No active session available. You cannot complete profile right now.', 403, 'NO_ACTIVE_SESSION'));
  }

  const { firstName, lastName, phone } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user.userId,
    { firstName, lastName, phone, isProfileComplete: true },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: 'success',
    message: 'Profile completed successfully',
    data: { user }
  });
});



// CreateAdmin
export const createAdmin = catchAsync(async (req, res, next) => {
  const { email, password, firstName, lastName, durationDays } = req.body;

  if (!email || !password || !firstName || !lastName) {
    return next(new AppError('Email, password, firstName, lastName are required', 400, 'VALIDATION_ERROR'));
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('Email already exists', 400, 'DUPLICATE_EMAIL'));
  }

  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();

  try {
    const [admin] = await User.create([{
      email,
      password,  // Hashed by pre-save hook
      firstName,
      lastName,
      role: 'admin',
      isProfileComplete: true,
      adminSessionId: null  // Will be set after session creation
    }], { session: mongoSession });

    const days = Number(durationDays) || 30;
    const durationMinutes = days * 24 * 60;  // Convert to minutes
    const now = new Date();
    const endDate = new Date(now.getTime() + durationMinutes * 60000);

    const sessionId = uuidv4();

    const defaultContent = Array.from({ length: Math.min(days, 30) }, (_, i) => ({
      day: i + 1,
      title: `Day ${i + 1} - Learning Content`,
      videoUrl: `https://cdn.example.com/day${i + 1}.mp4`,
      quizId: null,
      isUnlocked: i === 0  // Only Day 1 unlocked
    }));

    const [newSession] = await Session.create([{
      _id: sessionId,
      adminId: admin._id,
      title: `${firstName} ${lastName}'s Session`,
      description: `Auto-created for admin ${email}`,
      durationMinutes,
      startDate: now,
      endDate,
      expiresAt: endDate,  // TTL auto-delete
      status: 'active',
      price: 100,
      currency: 'USD',
      content: defaultContent,
      totalEnrolled: 0,
      maxSeats: null
    }], { session: mongoSession });

    await User.findByIdAndUpdate(
      admin._id,
      { adminSessionId: sessionId },
      { session: mongoSession }
    );

    await mongoSession.commitTransaction();

    admin.password = undefined;

    res.status(201).json({
      status: 'success',
      message: 'Admin and session created successfully.',
      data: {
        admin: {
          id: admin._id,
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          role: admin.role,
          adminSessionId: sessionId
        },
        session: {
          id: sessionId,
          title: newSession.title,
          durationDays: days,
          durationMinutes,
          startDate: now,
          endDate,
          expiresAt: endDate,
          status: 'active',
          contentDays: defaultContent.length
        }
      }
    });

  } catch (error) {
    await mongoSession.abortTransaction();

    if (error.code === 11000) {
      return next(new AppError('Duplicate email or session ID', 400, 'DUPLICATE_ERROR'));
    }

    return next(new AppError(`Creation failed: ${error.message}`, 500, 'TXN_FAILED'));
  } finally {
    mongoSession.endSession();
  }
});
