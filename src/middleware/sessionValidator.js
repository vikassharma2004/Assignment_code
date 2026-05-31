import AppError from '../utils/AppError.js';
import { catchAsync } from '../utils/catchAsync.js';
import Enrollment from '../models/Enrollment.js';
import Session from '../models/Session.js';

export const sessionValidator = catchAsync(async (req, res, next) => {
  const { sessionId, enrollmentId } = req.user;
  console.log(sessionId, enrollmentId)
  if (!sessionId || !enrollmentId) {
    return next(new AppError('You are not enrolled in any session.', 403, 'NOT_ENROLLED'));
  }

  const enrollment = await Enrollment.findById(enrollmentId);
  if (!enrollment) {
    return next(new AppError('Your session has expired. Please re-enroll.', 403, 'SESSION_EXPIRED'));
  }

  if (enrollment.status !== 'active' || (enrollment.expiresAt && enrollment.expiresAt < new Date())) {
    return next(new AppError('Your session has expired. Please re-enroll.', 403, 'SESSION_EXPIRED'));
  }

  const session = await Session.findById(sessionId);
  if (!session) {
    return next(new AppError('The session no longer exists.', 403, 'SESSION_REVOKED'));
  }

  if (session.status !== 'active' || (session.expiresAt && session.expiresAt < new Date())) {
    return next(new AppError('The session has expired or been revoked.', 403, 'SESSION_REVOKED'));
  }

  req.enrollment = enrollment;
  req.session = session;
  next();
});
