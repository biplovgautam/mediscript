import multer from "multer";
import type { Request } from "express";
import path from "path";
import type { FileFilterCallback } from "multer";


const storage = multer.diskStorage({
    destination: (
        req: Request,
        file: Express.Multer.File,
        cb: (error: Error | null, destination: string) => void
    ) => {
        cb(null, "uploads/");
    },
    filename: (
        req: Request,
        file: Express.Multer.File,
        cb: (error: Error | null, filename: string) => void
    ) => {
        const ext = path.extname(file.originalname);
        const sessionId = req.params.id || 'unknown';
        cb(null, `${sessionId}-${Date.now()}${ext}`);
    }
});

const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
) => {
    if (file.mimetype.startsWith("audio/") || file.mimetype === "application/octet-stream") {
        cb(null, true);
    } else {
        (cb as (error: Error | null, acceptFile: boolean) => void)(
            new Error("Not an audio file"),
            false
        );
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 1024 * 1024 * 10 } // 10 MB
});

const uploadSingleAudio = upload.single("audio");
export default uploadSingleAudio;