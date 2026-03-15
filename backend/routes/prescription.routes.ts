import { Router } from 'express';
import {
  finalizePrescription,
  finalizeLatestPrescriptionBySession,
  generatePrescriptionDraft,
  getLatestPrescriptionBySession,
  updateLatestPrescriptionBySession,
  updatePrescription,
} from '../controllers/prescription.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

router.post('/generate', generatePrescriptionDraft);
router.post('/draft', generatePrescriptionDraft);
router.get('/session/:sessionId', getLatestPrescriptionBySession);
router.get('/session/:sessionId/latest', getLatestPrescriptionBySession);
router.patch('/session/:sessionId', updateLatestPrescriptionBySession);
router.patch('/session/:sessionId/finalize', finalizeLatestPrescriptionBySession);
router.post('/session/:sessionId/finalize', finalizeLatestPrescriptionBySession);
router.patch('/:id', updatePrescription);
router.patch('/:id/finalize', finalizePrescription);
router.post('/:id/finalize', finalizePrescription);

export default router;
