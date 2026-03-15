import mongoose, { Document, Model, Schema } from 'mongoose';
import type { IHospital } from './hospital.model.js';
import type { IPatient } from './patient.model.js';
import type { IUser } from './user.model.js';
import type { IPrescription } from './prescription.model.js';
import type { IConsultationNote } from './consultationNote.model.js';
import type { ILabReport } from './labReport.model.js';

export enum EncounterType {
  OPD = 'OPD',
  FOLLOW_UP = 'FOLLOW_UP',
  EMERGENCY = 'EMERGENCY',
  TELEMEDICINE = 'TELEMEDICINE',
}

export enum SessionStatus {
  DRAFT = 'DRAFT',
  READY_TO_RECORD = 'READY_TO_RECORD',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  GENERATED = 'GENERATED',
  REVIEWED = 'REVIEWED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TranscriptionStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum AiGenerationStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface IConsultationSession extends Document {
  hospitalId: IHospital['_id'];
  patientId: IPatient['_id'];
  doctorId: IUser['_id'];
  startedBy?: IUser['_id'];
  sessionNumber?: string;
  encounterType: EncounterType;
  chiefComplaint?: string;
  reasonForVisit?: string;
  status: SessionStatus;
  startedAt?: Date;
  endedAt?: Date;
  durationSeconds: number;
  transcriptionStatus: TranscriptionStatus;
  aiGenerationStatus: AiGenerationStatus;
  currentPrescriptionId?: IPrescription['_id'];
  currentNoteId?: IConsultationNote['_id'];
  linkedLabReportIds: ILabReport['_id'][];
  tags: string[];
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IConsultationSessionModel extends Model<IConsultationSession> {}

const consultationSessionSchema = new Schema<IConsultationSession>(
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
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    sessionNumber: String,
    encounterType: {
      type: String,
      enum: Object.values(EncounterType),
      default: EncounterType.OPD,
    },
    chiefComplaint: String,
    reasonForVisit: String,
    status: {
      type: String,
      enum: Object.values(SessionStatus),
      default: SessionStatus.DRAFT,
    },
    startedAt: Date,
    endedAt: Date,
    durationSeconds: {
      type: Number,
      default: 0,
    },
    transcriptionStatus: {
      type: String,
      enum: Object.values(TranscriptionStatus),
      default: TranscriptionStatus.NOT_STARTED,
    },
    aiGenerationStatus: {
      type: String,
      enum: Object.values(AiGenerationStatus),
      default: AiGenerationStatus.NOT_STARTED,
    },
    currentPrescriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Prescription',
    },
    currentNoteId: {
      type: Schema.Types.ObjectId,
      ref: 'ConsultationNote',
    },
    linkedLabReportIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'LabReport',
      },
    ],
    tags: {
      type: [String],
      default: [],
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
consultationSessionSchema.index({ hospitalId: 1, patientId: 1, startedAt: 1 });
consultationSessionSchema.index({ hospitalId: 1, doctorId: 1, startedAt: 1 });
consultationSessionSchema.index({ status: 1 });

const ConsultationSession = mongoose.model<IConsultationSession, IConsultationSessionModel>(
  'ConsultationSession',
  consultationSessionSchema
);
export default ConsultationSession;