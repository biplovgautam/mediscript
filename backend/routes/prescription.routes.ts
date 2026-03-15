import { Router } from 'express';
import {
  finalizePrescription,
  generatePrescriptionDraft,
  getLatestPrescriptionBySession,
  updatePrescription,
} from '../controllers/prescription.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

router.post('/generate', generatePrescriptionDraft);
router.get('/session/:sessionId/latest', getLatestPrescriptionBySession);
router.patch('/:id', updatePrescription);
router.post('/:id/finalize', finalizePrescription);

export default router;
