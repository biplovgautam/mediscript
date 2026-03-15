import mongoose, { Document, Model, Schema } from 'mongoose';
import type { IHospital } from './hospital.model.js';
import type { IPatient } from './patient.model.js';
import type { IConsultationSession } from './consultationSession.model.js';
import type { IUser } from './user.model.js';

export enum DocumentType {
  OPD_CARD = 'OPD_CARD',
  PRESCRIPTION = 'PRESCRIPTION',
  LAB_REPORT = 'LAB_REPORT',
  AUDIO = 'AUDIO',
  TRANSCRIPT = 'TRANSCRIPT',
  OTHER = 'OTHER',
}

export enum OcrStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface IUploadedDocument extends Document {
  hospitalId: IHospital['_id'];
  patientId: IPatient['_id'];
  consultationSessionId?: IConsultationSession['_id'];
  uploadedBy?: IUser['_id'];
  documentType: DocumentType;
  title: string;
  originalFileName?: string;
  mimeType?: string;
  fileUrl: string;
  fileSizeBytes?: number;
  storageKey?: string;
  extractedText?: string;
  ocrStatus: OcrStatus;
  metadata?: any;           // Mixed type
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUploadedDocumentModel extends Model<IUploadedDocument> {}

const uploadedDocumentSchema = new Schema<IUploadedDocument>(
  {
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    consultationSessionId: {
      type: Schema.Types.ObjectId,
      ref: 'ConsultationSession',
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    documentType: {
      type: String,
      enum: Object.values(DocumentType),
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    originalFileName: String,
    mimeType: String,
    fileUrl: {
      type: String,
      required: true,
    },
    fileSizeBytes: Number,
    storageKey: String,
    extractedText: String,
    ocrStatus: {
      type: String,
      enum: Object.values(OcrStatus),
      default: OcrStatus.PENDING,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
uploadedDocumentSchema.index({ patientId: 1, documentType: 1 });
uploadedDocumentSchema.index({ consultationSessionId: 1 });
uploadedDocumentSchema.index({ hospitalId: 1, createdAt: 1 });

const UploadedDocument = mongoose.model<IUploadedDocument, IUploadedDocumentModel>(
  'UploadedDocument',
  uploadedDocumentSchema
);
export default UploadedDocument;