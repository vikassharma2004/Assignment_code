import express from 'express';
import { register, login, logout, refresh, forgotPassword, resetPassword, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/refresh', refresh);
router.get('/me', protect, getMe);

export default router;
