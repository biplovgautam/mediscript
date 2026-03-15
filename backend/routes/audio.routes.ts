import { Router } from 'express';
import {
	appendTranscriptChunk,
  getSessionAudio,
  updateTranscriptStatus,
  uploadSessionAudio,
} from '../controllers/audio.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { uploadAudio } from '../middleware/upload.middleware.js';

const router = Router();

router.use(protect);

router.post('/:sessionId/upload', uploadAudio, uploadSessionAudio);
router.get('/:sessionId', getSessionAudio);
router.post('/:sessionId/transcript-chunks', appendTranscriptChunk);
router.patch('/:sessionId/transcript-status', updateTranscriptStatus);

export default router;
