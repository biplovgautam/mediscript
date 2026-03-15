import { Router } from 'express';
import {
  finalizeNote,
  generateNoteDraft,
  getLatestNoteBySession,
  updateLatestNoteBySession,
  updateNote,
} from '../controllers/note.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

router.post('/generate', generateNoteDraft);
router.post('/draft', generateNoteDraft);
router.get('/session/:sessionId', getLatestNoteBySession);
router.get('/session/:sessionId/latest', getLatestNoteBySession);
router.patch('/session/:sessionId', updateLatestNoteBySession);
router.patch('/:id', updateNote);
router.post('/:id/finalize', finalizeNote);

export default router;
