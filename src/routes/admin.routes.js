import express from 'express';
import { createAdmin } from '../controllers/admincontroller.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.post('/', protect, restrictTo('superadmin'), createAdmin);

export default router;
