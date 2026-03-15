import mongoose, { Document, Model, Schema } from 'mongoose';
import type { IHospital } from './hospital.model.js';
import type { IConsultationSession } from './consultationSession.model.js';
import type { IPatient } from './patient.model.js';
import type { IUser } from './user.model.js';

export enum TranscriptStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface IAudioRecording extends Document {
  hospitalId: IHospital['_id'];
  consultationSessionId: IConsultationSession['_id'];
  patientId: IPatient['_id'];
  doctorId: IUser['_id'];
  fileUrl: string;
  storageKey?: string;
  originalFileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  durationSeconds: number;
  sampleRate?: number;
  channels?: number;
  transcriptionEngine?: string;
  transcriptionLanguage?: string;
  transcriptStatus: TranscriptStatus;
  uploadedAt: Date;
  processingStartedAt?: Date;
  processingCompletedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAudioRecordingModel extends Model<IAudioRecording> {}

const audioRecordingSchema = new Schema<IAudioRecording>(
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
    fileUrl: {
      type: String,
      required: true,
    },
    storageKey: String,
    originalFileName: String,
    mimeType: String,
    fileSizeBytes: Number,
    durationSeconds: {
      type: Number,
      default: 0,
    },
    sampleRate: Number,
    channels: Number,
    transcriptionEngine: String,
    transcriptionLanguage: String,
    transcriptStatus: {
      type: String,
      enum: Object.values(TranscriptStatus),
      default: TranscriptStatus.PENDING,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    processingStartedAt: Date,
    processingCompletedAt: Date,
    errorMessage: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
audioRecordingSchema.index({ transcriptStatus: 1 });
audioRecordingSchema.index({ patientId: 1, createdAt: 1 });
audioRecordingSchema.index({ consultationSessionId: 1, createdAt: 1 });

const AudioRecording = mongoose.model<IAudioRecording, IAudioRecordingModel>(
  'AudioRecording',
  audioRecordingSchema
);
export default AudioRecording;
