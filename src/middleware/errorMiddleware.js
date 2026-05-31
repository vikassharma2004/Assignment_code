import AppError from '../utils/AppError.js';

export const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  let error = { ...err, message: err.message };
  error.statusCode = err.statusCode;
  error.status = err.status;
  error.errorCode = err.errorCode;
  error.message = err.message;

  // Mongoose Cast Error
  if (err.name === 'CastError') {
    const message = `Invalid ${err.path}: ${err.value}`;
    error = new AppError(message, 400, 'CAST_ERROR');
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    const message = `Invalid input data. ${messages.join('. ')}`;
    error = new AppError(message, 400, 'VALIDATION_ERROR');
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate field value: ${field}. Please use another value.`;
    error = new AppError(message, 400, 'DUPLICATE_KEY');
  }


  res.status(error.statusCode || 500).json({
    status: error.status,
    errorCode: error.errorCode || 'INTERNAL_ERROR',
    message: error.message || 'Something went very wrong!',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
