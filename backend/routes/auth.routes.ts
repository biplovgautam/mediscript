import { Router } from 'express';
import { getMe, login, logout, register, enrollVoice, deleteVoice } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { uploadAudio } from '../middleware/upload.middleware.js';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.post('/enroll-voice', protect, uploadAudio, enrollVoice);
router.delete('/enroll-voice', protect, deleteVoice);

export default router;
