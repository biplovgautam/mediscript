import { Router } from 'express';
import {
  finalizeNote,
  generateAiDraftFromTranscript,
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
router.post('/ai-draft', generateAiDraftFromTranscript);
router.post('/ai-draft/:sessionId', generateAiDraftFromTranscript);
router.get('/session/:sessionId', getLatestNoteBySession);
router.get('/session/:sessionId/latest', getLatestNoteBySession);
router.patch('/session/:sessionId', updateLatestNoteBySession);
router.patch('/:id', updateNote);
router.post('/:id/finalize', finalizeNote);

export default router;
