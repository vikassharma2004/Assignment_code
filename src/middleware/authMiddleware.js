import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import AppError from '../utils/AppError.js';
import { catchAsync } from '../utils/catchAsync.js';
import User from '../models/User.js';
import { env } from '../config/env.js';
import TokenBlacklist from '../models/TokenBlacklist.js';

export const protect = catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in. Please provide a valid Bearer token.', 401, 'UNAUTHORIZED'));
  }

  const jwtVerify = promisify(jwt.verify);
  let decoded;
  try {
    decoded = await jwtVerify(token, env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Your token has expired. Please log in again.', 401, 'TOKEN_EXPIRED'));
    }
    return next(new AppError('Invalid token. Please log in again.', 401, 'TOKEN_INVALID'));
  }

  const isBlacklisted = await TokenBlacklist.findOne({ token });
  if (isBlacklisted) {
    return next(new AppError('This token has been revoked. Please log in again.', 401, 'TOKEN_INVALID'));
  }

  const currentUser = await User.findById(decoded.userId);
  if (!currentUser) {
    return next(new AppError('The user belonging to this token no longer exists.', 401, 'USER_NOT_FOUND'));
  }

  if (!currentUser.isActive) {
    return next(new AppError('User account is deactivated.', 403, 'ACCOUNT_DEACTIVATED'));
  }

  req.user = decoded; // { userId, role, sessionId, enrollmentId, jti }
  next();
});
