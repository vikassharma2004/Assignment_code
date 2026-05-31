import { validationResult } from 'express-validator';
import AppError from '../utils/AppError.js';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const extractErrors = errors.array().map((err) => {
      return { field: err.path, message: err.msg };
    });
    
    return next(
      new AppError(
        `Validation Error: ${extractErrors.map((e) => e.message).join(', ')}`,
        400,
        'VALIDATION_ERROR'
      )
    );
  }
  next();
};
