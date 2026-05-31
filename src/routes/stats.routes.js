import express from 'express';
import { getMyStats, trackProgress } from '../controllers/statsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/my', getMyStats);
router.post('/progress', trackProgress);

export default router;
