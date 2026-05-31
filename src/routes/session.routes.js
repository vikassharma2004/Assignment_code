import express from 'express';
import { createSession, revokeSession, getActiveSessions, getSessionDetails } from '../controllers/sessionController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.post('/', protect, restrictTo('admin', 'superadmin'), createSession);
router.delete('/:id', protect, restrictTo('admin', 'superadmin'), revokeSession);
router.get('/', getActiveSessions);
router.get('/:id', getSessionDetails);

export default router;
