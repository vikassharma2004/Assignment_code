import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import TokenBlacklist from '../models/TokenBlacklist.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { env } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';
import Enrollment from '../models/Enrollment.js';

const signTokens = (userId, role, sessionId = null, enrollmentId = null) => {
  const jti = uuidv4();
  const payload = { userId, role, sessionId, enrollmentId, jti };
  
  const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRE });
  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRE });

  return { accessToken, refreshToken };
};

// Register
export const register = catchAsync(async (req, res, next) => {
  const { email, password, firstName, lastName, phone, role, orgName } = req.body;

  if (role && !['user', 'organization'].includes(role)) {
    return next(new AppError('Invalid role specified', 400, 'VALIDATION_ERROR'));
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('Email already registered', 400, 'VALIDATION_ERROR'));
  }

  const userData = { email, password, firstName, lastName, phone, role: role || 'user' };

  if (userData.role === 'organization') {
    if (!orgName) return next(new AppError('Organization name is required', 400, 'VALIDATION_ERROR'));
    userData.organizationDetails = { name: orgName };
  }

  const user = await User.create(userData);

  res.status(201).json({
    status: 'success',
    data: {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        isProfileComplete: user.isProfileComplete
      }
    }
  });
});

// Login
export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400, 'VALIDATION_ERROR'));
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Incorrect email or password', 401, 'UNAUTHORIZED'));
  }

  if (!user.isActive) {
    return next(new AppError('Account is deactivated', 403, 'ACCOUNT_DEACTIVATED'));
  }

  let sessionId = null;
  let enrollmentId = null;

  if (user.role === 'user') {
   
    const activeEnrollment = await Enrollment.findOne({ 
      userId: user._id, 
      status: 'active',
      expiresAt: { $gt: new Date() }
    });

    if (activeEnrollment) {
      sessionId = activeEnrollment.sessionId;
      enrollmentId = activeEnrollment._id;
    }
  }

  const { accessToken, refreshToken } = signTokens(user._id, user.role, sessionId, enrollmentId);

  res.status(200).json({
    status: 'success',
    data: {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        isProfileComplete: user.isProfileComplete
      }
    }
  });
});

// Logout
export const logout = catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      await TokenBlacklist.create({
        token,
        expiresAt: new Date(decoded.exp * 1000)
      });
    }
  }

  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
});

// Refresh
export const refresh = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return next(new AppError('Refresh token required', 400, 'VALIDATION_ERROR'));

  const isBlacklisted = await TokenBlacklist.findOne({ token: refreshToken });
  if (isBlacklisted) return next(new AppError('Refresh token revoked', 401, 'TOKEN_INVALID'));

  try {
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return next(new AppError('User not found', 401, 'USER_NOT_FOUND'));

    await TokenBlacklist.create({ token: refreshToken, expiresAt: new Date(decoded.exp * 1000) });

    const newTokens = signTokens(user._id, user.role, decoded.sessionId, decoded.enrollmentId);

    res.status(200).json({
      status: 'success',
      data: newTokens
    });
  } catch (error) {
    return next(new AppError('Invalid refresh token', 401, 'TOKEN_INVALID'));
  }
});

// ForgotPassword
export const forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return next(new AppError('User not found', 404, 'NOT_FOUND'));

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'Password reset link sent',
    data: { mockResetToken: resetToken } // For testing purposes
  });
});

// ResetPassword
export const resetPassword = catchAsync(async (req, res, next) => {
  const { token, newPassword } = req.body;
  
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) return next(new AppError('Token invalid or expired', 400, 'VALIDATION_ERROR'));

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'Password reset successfully'
  });
});

// GetMe
export const getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.userId);
  res.status(200).json({ status: 'success', data: { user } });
});
