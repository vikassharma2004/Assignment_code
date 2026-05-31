import { body, param } from 'express-validator';

const isValidUUID = (value) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

export const registerValidator = [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
];

export const loginValidator = [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const completeProfileValidator = [
  body('firstName').notEmpty().trim().withMessage('First name is required'),
  body('lastName').notEmpty().trim().withMessage('Last name is required'),
  body('phone').matches(/^\+?[1-9]\d{1,14}$/).withMessage('Valid mobile number is required'),
  body('avatar').optional().isString().trim(),
];

export const createSessionValidator = [
  body('title').notEmpty().trim().withMessage('Title is required'),
  body('durationMinutes').isInt({ min: 1 }).withMessage('Duration must be at least 1 minute'),
];

export const sessionIdParamValidator = [
  param('id').custom(isValidUUID).withMessage('Invalid session ID format'),
];

export const enrollValidator = [
  body('sessionId').custom(isValidUUID).withMessage('Invalid session ID format'),
  body('amount').isNumeric().withMessage('Amount is required and must be a number'),
];

export const sponsorValidator = [
  body('targetUserEmail').isEmail().withMessage('Valid target user email is required'),
  body('sessionId').custom(isValidUUID).withMessage('Invalid session ID format'),
  body('amount').isNumeric().withMessage('Amount is required and must be a number'),
];
