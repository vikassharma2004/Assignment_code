import mongoose from 'mongoose';
import Session from '../models/Session.js';
import Enrollment from '../models/Enrollment.js';
import User from '../models/User.js';
import TokenBlacklist from '../models/TokenBlacklist.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { v4 as uuidv4 } from 'uuid';

// CreateSession
export const createSession = catchAsync(async (req, res, next) => {
  const { title, description, durationMinutes, price = 100, content } = req.body;

  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();

  try {
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const newSession = await Session.create([{
      _id: sessionId,
      adminId: req.user.userId,
      title,
      description,
      durationMinutes,
      price,
      expiresAt,
      content
    }], { session: mongoSession });

    await User.findByIdAndUpdate(
      req.user.userId,
      { adminSessionId: sessionId },
      { session: mongoSession }
    );

    await mongoSession.commitTransaction();
    mongoSession.endSession();

    res.status(201).json({
      status: 'success',
      data: { session: newSession[0] }
    });
  } catch (error) {
    await mongoSession.abortTransaction();
    mongoSession.endSession();
    return next(new AppError('Transaction failed: ' + error.message, 500, 'TXN_ABORTED'));
  }
});

// RevokeSession
export const revokeSession = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();

  try {
    const sessionToRevoke = await Session.findById(id).session(mongoSession);
    if (!sessionToRevoke) {
      throw new Error('Session not found');
    }

    sessionToRevoke.status = 'revoked';
    await sessionToRevoke.save({ session: mongoSession });

    await Enrollment.updateMany(
      { sessionId: id, status: 'active' },
      { $set: { status: 'expired' } },
      { session: mongoSession }
    );

    await User.updateOne(
      { adminSessionId: id },
      { $set: { adminSessionId: null } },
      { session: mongoSession }
    );


    await mongoSession.commitTransaction();
    mongoSession.endSession();

    res.status(200).json({
      status: 'success',
      message: 'Session revoked successfully'
    });
  } catch (error) {
    await mongoSession.abortTransaction();
    mongoSession.endSession();
    return next(new AppError('Transaction failed: ' + error.message, 500, 'TXN_ABORTED'));
  }
});

// GetActiveSessions
export const getActiveSessions = catchAsync(async (req, res, next) => {
  const sessions = await Session.find({ status: 'active', expiresAt: { $gt: new Date() } });
  res.status(200).json({
    status: 'success',
    data: { sessions }
  });
});

// GetSessionDetails
export const getSessionDetails = catchAsync(async (req, res, next) => {
  const session = await Session.findById(req.params.id);
  if (!session) {
    return next(new AppError('Session not found', 404, 'NOT_FOUND'));
  }
  res.status(200).json({
    status: 'success',
    data: { session }
  });
});
