import { Router } from 'express';
import {
  getPatientLabReports,
  getSessionLabReports,
  linkReportToSession,
  uploadLabReport,
} from '../controllers/labReport.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { uploadLabReportFlexible } from '../middleware/upload.middleware.js';

const router = Router();

router.use(protect);

router.post('/upload/:patientId', uploadLabReportFlexible, uploadLabReport);
router.post('/patient/:patientId', uploadLabReportFlexible, uploadLabReport);
router.get('/patient/:patientId', getPatientLabReports);
router.get('/session/:sessionId', getSessionLabReports);
router.patch('/:id/link-session', linkReportToSession);
router.patch('/:id/link-to-session', linkReportToSession);

export default router;
