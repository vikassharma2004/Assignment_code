import express from 'express';
import { getDailyContent, watchVideo } from '../controllers/contentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { sessionValidator } from '../middleware/sessionValidator.js';

const router = express.Router();

router.use(protect, sessionValidator);

router.get('/daily', getDailyContent);
router.post('/video/watch', watchVideo);

export default router;
