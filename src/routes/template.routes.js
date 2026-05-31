import express from 'express';
import { createContentTemplate, createQuizTemplate, getTemplates, getTemplateById } from '../controllers/template.controller.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get('/', protect, getTemplates);
router.get('/:id', protect, getTemplateById);

router.post('/content', protect, restrictTo('superadmin'), createContentTemplate);
router.post('/quiz', protect, restrictTo('superadmin'), createQuizTemplate);

export default router;
