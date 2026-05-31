import express from 'express';
import { attemptQuiz, getQuizQuestions } from '../controllers/quizController.js';
import { protect } from '../middleware/authMiddleware.js';
import { sessionValidator } from '../middleware/sessionValidator.js';

const router = express.Router();

router.post('/attempt', protect, sessionValidator, attemptQuiz);
router.get('/:day', protect, sessionValidator, getQuizQuestions);


export default router;
