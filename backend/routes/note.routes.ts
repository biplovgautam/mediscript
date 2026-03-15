import { Router } from 'express';
import {
  finalizeNote,
  generateNoteDraft,
  getLatestNoteBySession,
  updateNote,
} from '../controllers/note.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

router.post('/generate', generateNoteDraft);
router.get('/session/:sessionId/latest', getLatestNoteBySession);
router.patch('/:id', updateNote);
router.post('/:id/finalize', finalizeNote);

export default router;
