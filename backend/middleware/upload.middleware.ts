import multer from "multer";
import type { Request } from "express";
import path from "path";
import type { FileFilterCallback } from "multer";
import fs from "fs";

// Ensure upload directories exist
const createDirIfNotExists = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Default destination – can be overridden
const DEFAULT_UPLOAD_DIR = "uploads/";
createDirIfNotExists(DEFAULT_UPLOAD_DIR);

// Options interface for the uploader factory
export interface UploadOptions {
  destination?: string | ((req: Request, file: Express.Multer.File) => string);
  filename?: (req: Request, file: Express.Multer.File) => string;
  fileFilter?: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => void;
  limits?: multer.Options["limits"];
  fieldName?: string;
}

// Factory function to create a configured multer middleware
export const createUploader = (options: UploadOptions = {}) => {
  const {
    destination = DEFAULT_UPLOAD_DIR,
    filename = (req, file) => `${Date.now()}-${file.originalname}`,
    fileFilter,
    limits = { fileSize: 10 * 1024 * 1024 }, // 10 MB default
    fieldName = "file",
  } = options;

  const storage = multer.diskStorage({
    destination:
      typeof destination === "function"
        ? destination
        : (req, file, cb) => {
            createDirIfNotExists(destination);
            cb(null, destination);
          },
    filename,
  });

  // Build multer options conditionally
  const multerOptions: multer.Options = {
    storage,
    limits,
  };
  if (fileFilter) {
    multerOptions.fileFilter = fileFilter;
  }

  const upload = multer(multerOptions);
  return upload.single(fieldName);
};

// Pre‑configured uploader for consultation audio
export const uploadAudio = createUploader({
  destination: "uploads/audio/",
  filename: (req, file) => {
    const ext = path.extname(file.originalname);
    const sessionId = req.params.id || "unknown";
    return `${sessionId}-${Date.now()}${ext}`;
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("audio/") || file.mimetype === "application/octet-stream") {
      cb(null, true);
    } else {
      cb(new Error("Not an audio file"));
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB for longer recordings
  fieldName: "audio",
});

// Pre‑configured uploader for lab report PDFs / images
export const uploadLabReport = createUploader({
  destination: "uploads/lab-reports/",
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["application/pdf", "image/jpeg", "image/png"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, JPEG, and PNG files are allowed"));
    }
  },
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fieldName: "labReport",
});

// Pre‑configured uploader for patient documents (OPD cards, etc.)
export const uploadPatientDocument = createUploader({
  destination: "uploads/patient-docs/",
  fileFilter: (req, file, cb) => {
    // Accept images, PDFs, and common document types
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type"));
    }
  },
  limits: { fileSize: 20 * 1024 * 1024 },
  fieldName: "document",
});

// Default export for backward compatibility (single audio upload)
export default uploadAudio;