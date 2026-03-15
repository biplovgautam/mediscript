import mongoose, { Document, Model, Schema } from 'mongoose';
import type { IHospital } from './hospital.model.js';
import type { IConsultationSession } from './consultationSession.model.js';
import type { IPatient } from './patient.model.js';
import type { IUser } from './user.model.js';
import type { IConsultationNote } from './consultationNote.model.js';

export enum PrescriptionStatus {
  AI_DRAFT = 'AI_DRAFT',
  DOCTOR_EDITED = 'DOCTOR_EDITED',
  FINALIZED = 'FINALIZED',
  CANCELLED = 'CANCELLED',
}

export enum BeforeAfterFood {
  BEFORE_FOOD = 'BEFORE_FOOD',
  AFTER_FOOD = 'AFTER_FOOD',
  WITH_FOOD = 'WITH_FOOD',
  ANYTIME = 'ANYTIME',
}

// Subdocument interface for medication
export interface IMedication {
  medicineName: string;
  genericName?: string;
  strength?: string;
  dosageForm?: string;
  route?: string;
  dose?: string;
  frequency?: string;
  durationDays?: number;
  durationText?: string;
  quantity?: number;
  instructions?: string;
  beforeAfterFood?: BeforeAfterFood;
  displayOrder: number;
}

const medicationSchema = new Schema<IMedication>({
  medicineName: { type: String, required: true },
  genericName: String,
  strength: String,
  dosageForm: String,
  route: String,
  dose: String,
  frequency: String,
  durationDays: Number,
  durationText: String,
  quantity: Number,
  instructions: String,
  beforeAfterFood: {
    type: String,
    enum: Object.values(BeforeAfterFood),
  },
  displayOrder: { type: Number, default: 0 },
});

export interface IPrescription extends Document {
  hospitalId: IHospital['_id'];
  consultationSessionId: IConsultationSession['_id'];
  patientId: IPatient['_id'];
  doctorId: IUser['_id'];
  consultationNoteId?: IConsultationNote['_id'];
  version: number;
  status: PrescriptionStatus;
  diagnosisText?: string;
  advice?: string;
  followUp?: string;
  warnings: string[];
  pdfUrl?: string;
  generatedAt?: Date;
  finalizedAt?: Date;
  finalizedBy?: IUser['_id'];
  items: IMedication[];
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPrescriptionModel extends Model<IPrescription> {}

const prescriptionSchema = new Schema<IPrescription>(
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
    consultationNoteId: {
      type: Schema.Types.ObjectId,
      ref: 'ConsultationNote',
    },
    version: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: Object.values(PrescriptionStatus),
      default: PrescriptionStatus.AI_DRAFT,
    },
    diagnosisText: String,
    advice: String,
    followUp: String,
    warnings: {
      type: [String],
      default: [],
    },
    pdfUrl: String,
    generatedAt: Date,
    finalizedAt: Date,
    finalizedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    items: [medicationSchema],
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
prescriptionSchema.index({ consultationSessionId: 1, version: 1 });
prescriptionSchema.index({ patientId: 1, createdAt: 1 });
prescriptionSchema.index({ status: 1 });

const Prescription = mongoose.model<IPrescription, IPrescriptionModel>(
  'Prescription',
  prescriptionSchema
);
export default Prescription;