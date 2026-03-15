import mongoose, { Document, Model, Schema } from 'mongoose';
import type { IHospital } from './hospital.model.js';
import type { IConsultationSession } from './consultationSession.model.js';
import type { IAudioRecording } from './audioRecording.model.js';

export enum SpeakerRole {
  DOCTOR = 'DOCTOR',
  PATIENT = 'PATIENT',
  SYSTEM = 'SYSTEM',
  UNKNOWN = 'UNKNOWN',
}

export enum TranscriptSource {
  AI = 'AI',
  MANUAL = 'MANUAL',
  IMPORTED = 'IMPORTED',
}

export interface ITranscriptSegment extends Document {
  hospitalId: IHospital['_id'];
  consultationSessionId: IConsultationSession['_id'];
  audioRecordingId?: IAudioRecording['_id'];
  sequenceNumber: number;
  speakerRole: SpeakerRole;
  speakerLabel?: string;
  text: string;
  startMs?: number;
  endMs?: number;
  confidence?: number;
  source: TranscriptSource;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITranscriptSegmentModel extends Model<ITranscriptSegment> {}

const transcriptSegmentSchema = new Schema<ITranscriptSegment>(
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
    audioRecordingId: {
      type: Schema.Types.ObjectId,
      ref: 'AudioRecording',
    },
    sequenceNumber: {
      type: Number,
      required: true,
    },
    speakerRole: {
      type: String,
      enum: Object.values(SpeakerRole),
      required: true,
    },
    speakerLabel: String,
    text: {
      type: String,
      required: true,
    },
    startMs: Number,
    endMs: Number,
    confidence: Number,
    source: {
      type: String,
      enum: Object.values(TranscriptSource),
      default: TranscriptSource.AI,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index: consultationSessionId + sequenceNumber
transcriptSegmentSchema.index(
  { consultationSessionId: 1, sequenceNumber: 1 },
  { unique: true }
);

// Other indexes
transcriptSegmentSchema.index({ audioRecordingId: 1 });

// Enable text search on 'text' field (optional)
transcriptSegmentSchema.index({ text: 'text' });

const TranscriptSegment = mongoose.model<ITranscriptSegment, ITranscriptSegmentModel>(
  'TranscriptSegment',
  transcriptSegmentSchema
);
export default TranscriptSegment;