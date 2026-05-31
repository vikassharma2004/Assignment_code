import mongoose from 'mongoose';
import Enrollment from '../models/Enrollment.js';
import Session from '../models/Session.js';
import User from '../models/User.js';
import Progress from '../models/Progress.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { v4 as uuidv4 } from 'uuid';

// SponsorUsers
export const sponsorUsers = catchAsync(async (req, res, next) => {
  const { userEmails, paymentMethod } = req.body;
  const orgId = req.user.userId;

  if (!Array.isArray(userEmails) || userEmails.length === 0) {
    return next(new AppError('Please provide an array of user emails to sponsor', 400, 'VALIDATION_ERROR'));
  }

  const activeSession = await Session.findOne({
    status: 'active',
    expiresAt: { $gt: new Date() }
  });

  if (!activeSession) {
    return next(new AppError('No active session available.', 503, 'NO_ACTIVE_SESSION'));
  }

  const org = await User.findById(orgId);


  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();

  const sponsoredResults = [];

  try {
    for (const email of userEmails) {
      const user = await User.findOne({ email }).session(mongoSession);
      if (!user) {
        sponsoredResults.push({ email, status: 'fail', reason: 'User not found' });
        continue;
      }

      if (!user.isProfileComplete) {
        sponsoredResults.push({ email, status: 'fail', reason: 'Profile incomplete' });
        continue;
      }

      const existing = await Enrollment.findOne({
        userId: user._id,
        status: 'active',
        expiresAt: { $gt: new Date() }
      }).session(mongoSession);

      if (existing) {
        sponsoredResults.push({ email, status: 'fail', reason: 'Already enrolled' });
        continue;
      }

      if (activeSession.maxSeats && activeSession.totalEnrolled >= activeSession.maxSeats) {
        sponsoredResults.push({ email, status: 'fail', reason: 'Session full' });
        continue;
      }

      const enrollmentId = uuidv4();
      await Enrollment.create([{
        _id: enrollmentId,
        userId: user._id,
        sessionId: activeSession._id,
        paymentMethod: 'organization',
        paymentStatus: 'sponsored',
        sponsoredBy: orgId,
        expiresAt: activeSession.expiresAt
      }], { session: mongoSession });

      activeSession.totalEnrolled += 1;
      await activeSession.save({ session: mongoSession });

      sponsoredResults.push({ email, status: 'success', enrollmentId });
    }

    const successCount = sponsoredResults.filter(r => r.status === 'success').length;
    const actualCost = activeSession.price * successCount;

    await mongoSession.commitTransaction();
    mongoSession.endSession();

    res.status(200).json({
      status: 'success',
      data: {
        sponsored: sponsoredResults,
        sessionTitle: activeSession.title,
        totalAmount: actualCost,
        message: `Successfully sponsored ${successCount} user(s) '`
      }
    });
  } catch (error) {
    await mongoSession.abortTransaction();
    mongoSession.endSession();
    return next(new AppError('Transaction failed: ' + error.message, 500, 'TXN_ABORTED'));
  }
});
