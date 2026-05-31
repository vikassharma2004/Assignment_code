import express from 'express';
import { getProfile, completeProfile } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get('/profile', protect, getProfile);
router.put('/profile', protect, restrictTo('user', 'organization'), completeProfile);


export default router;
