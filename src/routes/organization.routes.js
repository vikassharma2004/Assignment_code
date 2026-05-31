import express from 'express';
import { sponsorUsers } from '../controllers/organizationController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.post('/sponsor', protect, restrictTo('organization'), sponsorUsers);

export default router;
