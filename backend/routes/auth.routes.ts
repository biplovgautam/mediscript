import { Router } from 'express';
import { getMe, login, logout, register } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/login', login);
router.post('/register', protect, register);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

export default router;
