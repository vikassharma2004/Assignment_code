import express from 'express';
import { createEnrollment, getMyEnrollment } from '../controllers/enrollmentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createEnrollment);
router.get('/my', protect, getMyEnrollment);

export default router;
