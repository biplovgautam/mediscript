import { Router } from 'express';
import {
  createPatient,
  getPatientById,
  getPatientOverview,
  getPatients,
  updatePatient,
} from '../controllers/patient.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

router.get('/', getPatients);
router.post('/', createPatient);
router.get('/:id/overview', getPatientOverview);
router.get('/:id', getPatientById);
router.patch('/:id', updatePatient);

export default router;
