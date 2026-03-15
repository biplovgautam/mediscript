import mongoose, { Document, Model, Schema } from 'mongoose';
import type { IHospital } from './hospital.model.js';
import type { IConsultationSession } from './consultationSession.model.js';
import type { IPatient } from './patient.model.js';
import type { IUser } from './user.model.js';

export enum NoteSource {
  AI = 'AI',
  DOCTOR = 'DOCTOR',
  MIXED = 'MIXED',
}

export enum NoteStatus {
  DRAFT = 'DRAFT',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
  FINALIZED = 'FINALIZED',
}

export interface IConsultationNote extends Document {
  hospitalId: IHospital['_id'];
  consultationSessionId: IConsultationSession['_id'];
  patientId: IPatient['_id'];
  doctorId: IUser['_id'];
  version: number;
  source: NoteSource;
  status: NoteStatus;
  chiefComplaint?: string;
  symptoms: string[];
  medicalHistory?: string;
  examinationFindings?: string;
  assessment?: string;
  diagnosisSummary?: string;
  plan?: string;
  followUpInstructions?: string;
  doctorNotes?: string;
  aiModelName?: string;
  aiConfidence?: number;
  generatedAt?: Date;
  finalizedAt?: Date;
  finalizedBy?: IUser['_id'];
  reviewComments?: string;
  rawAiPayload?: any;        // Mixed
  createdAt: Date;
  updatedAt: Date;
}

export interface IConsultationNoteModel extends Model<IConsultationNote> {}

const consultationNoteSchema = new Schema<IConsultationNote>(
  {
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
    },
    consultationSessionId: {
      type: Schema.Types.ObjectId,
      ref: 'ConsultationSession',
      required: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    source: {
      type: String,
      enum: Object.values(NoteSource),
      default: NoteSource.AI,
    },
    status: {
      type: String,
      enum: Object.values(NoteStatus),
      default: NoteStatus.DRAFT,
    },
    chiefComplaint: String,
    symptoms: {
      type: [String],
      default: [],
    },
    medicalHistory: String,
    examinationFindings: String,
    assessment: String,
    diagnosisSummary: String,
    plan: String,
    followUpInstructions: String,
    doctorNotes: String,
    aiModelName: String,
    aiConfidence: Number,
    generatedAt: Date,
    finalizedAt: Date,
    finalizedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewComments: String,
    rawAiPayload: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
consultationNoteSchema.index({ consultationSessionId: 1, version: 1 });
consultationNoteSchema.index({ patientId: 1, createdAt: 1 });
consultationNoteSchema.index({ status: 1 });

const ConsultationNote = mongoose.model<IConsultationNote, IConsultationNoteModel>(
  'ConsultationNote',
  consultationNoteSchema
);
export default ConsultationNote;