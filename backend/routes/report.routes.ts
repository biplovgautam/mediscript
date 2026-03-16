import { Router } from "express";
import { downloadOpdPdf } from "../controllers/report.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.use(protect);

router.get("/opd/:sessionId.pdf", downloadOpdPdf);
router.get("/opd/:sessionId", downloadOpdPdf);

export default router;
