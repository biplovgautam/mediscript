import { Router } from 'express';
import {
  createSession,
  getSessionById,
  getSessions,
  getSessionWorkspaceData,
  linkLabReportsToSession,
  startSessionRecording,
  stopSessionRecording,
} from '../controllers/session.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

router.get('/', getSessions);
router.post('/', createSession);
router.get('/:id/workspace', getSessionWorkspaceData);
router.post('/:id/start', startSessionRecording);
router.post('/:id/stop', stopSessionRecording);
router.patch('/:id/lab-reports', linkLabReportsToSession);
router.get('/:id', getSessionById);

export default router;
