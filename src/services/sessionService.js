import mongoose from 'mongoose';
import User from '../models/User.js';
import Session from '../models/Session.js';
import Enrollment from '../models/Enrollment.js';
import Progress from '../models/Progress.js';
import { generateUUID } from '../utils/uuid.js';
import AppError from '../utils/AppError.js';

export const createSessionService = async (adminId, title, description, durationMinutes, price, content) => {
  const sessionId = generateUUID();
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  const session = new Session({
    _id: sessionId,
    adminId,
    title,
    description,
    durationMinutes,
    startDate,
    endDate,
    expiresAt: endDate,
    price: price || 100,
    content: content.map((c) => ({ ...c, isUnlocked: c.day === 1 })),
  });

  await session.save();

  await User.findByIdAndUpdate(adminId, { adminSessionId: sessionId });

  return session;
};

export const deleteSessionService = async (sessionId, userId, isSuperAdmin) => {
  const session = await Session.findById(sessionId);
  if (!session) {
    throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
  }

  if (!isSuperAdmin && session.adminId.toString() !== userId) {
    throw new AppError('You are not authorized to delete this session', 403, 'UNAUTHORIZED');
  }

  const transaction = await mongoose.startSession();
  transaction.startTransaction();

  try {
    await Session.findByIdAndUpdate(sessionId, { status: 'revoked' }, { session: transaction });

    const enrollments = await Enrollment.find({ sessionId, status: { $ne: 'expired' } });
    const enrollmentIds = enrollments.map((e) => e._id);

    await Enrollment.updateMany({ sessionId }, { status: 'expired' }, { session: transaction });

    await User.findByIdAndUpdate(session.adminId, { adminSessionId: null }, { session: transaction });

    await transaction.commitTransaction();
    transaction.endSession();

    return { revokedEnrollments: enrollments.length };
  } catch (error) {
    await transaction.abortTransaction();
    transaction.endSession();
    throw error;
  }
};

export const sponsorUsersService = async (orgId, userEmails, sessionId) => {
  const org = await User.findById(orgId);
  if (!org || org.role !== 'organization') {
    throw new AppError('Only organizations can sponsor users', 403, 'FORBIDDEN');
  }

  const session = await Session.findById(sessionId);
  if (!session) {
    throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
  }

  const transaction = await mongoose.startSession();
  transaction.startTransaction();

  const sponsored = [];
  let totalAmount = 0;

  try {
    for (const email of userEmails) {
      const user = await User.findOne({ email });
      if (!user) {
        continue;
      }

      const existingEnrollment = await Enrollment.findOne({ userId: user._id, sessionId });
      if (existingEnrollment) {
        continue;
      }

      const enrollmentId = generateUUID();
      const progressId = generateUUID();

      await Enrollment.create(
        [
          {
            _id: enrollmentId,
            userId: user._id,
            sessionId,
            status: 'active',
            paymentStatus: 'sponsored',
            paymentMethod: 'organization',
            sponsoredBy: orgId,
            expiresAt: session.expiresAt,
          },
        ],
        { session: transaction }
      );

      await Progress.create(
        [
          {
            _id: progressId,
            userId: user._id,
            sessionId,
            enrollmentId,
            dailyProgress: [],
            totalScore: 0,
            daysCompleted: 0,
          },
        ],
        { session: transaction }
      );

      sponsored.push({
        userId: user._id,
        email: user.email,
        enrollmentId,
        status: 'active',
      });
      totalAmount += session.price;
    }

    await transaction.commitTransaction();
    transaction.endSession();

    return {
      sponsored,
      totalAmount,
      creditsRemaining: org.organizationDetails.credits - totalAmount,
    };
  } catch (error) {
    await transaction.abortTransaction();
    transaction.endSession();
    throw error;
  }
};
