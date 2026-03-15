import mongoose, { Document, Model, Schema } from 'mongoose';
import type { IHospital } from './hospital.model.js'

export enum Sex {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum BloodGroup {
  A_POSITIVE = 'A+',
  A_NEGATIVE = 'A-',
  B_POSITIVE = 'B+',
  B_NEGATIVE = 'B-',
  O_POSITIVE = 'O+',
  O_NEGATIVE = 'O-',
  AB_POSITIVE = 'AB+',
  AB_NEGATIVE = 'AB-',
}

export interface IPatient extends Document {
  hospitalId: IHospital['_id'];
  patientGlobalId: string;    // unique per hospital
  fullName: string;
  firstName?: string;
  lastName?: string;
  dob?: Date;
  age?: number;
  sex?: Sex;
  bloodGroup?: BloodGroup;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  notes?: string;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPatientModel extends Model<IPatient> {}

const patientSchema = new Schema<IPatient>(
  {
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
    },
    patientGlobalId: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    firstName: String,
    lastName: String,
    dob: Date,
    age: Number,
    sex: {
      type: String,
      enum: Object.values(Sex),
    },
    bloodGroup: {
      type: String,
      enum: Object.values(BloodGroup),
    },
    phone: String,
    email: String,
    address: String,
    city: String,
    emergencyContactName: String,
    emergencyContactPhone: String,
    allergies: {
      type: [String],
      default: [],
    },
    chronicConditions: {
      type: [String],
      default: [],
    },
    currentMedications: {
      type: [String],
      default: [],
    },
    notes: String,
    isActive: {
      type: Boolean,
      default: true,
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

// Unique compound index: hospitalId + patientGlobalId
patientSchema.index({ hospitalId: 1, patientGlobalId: 1 }, { unique: true });

// Other indexes
patientSchema.index({ hospitalId: 1, fullName: 1 });
patientSchema.index({ hospitalId: 1, phone: 1 });

const Patient = mongoose.model<IPatient, IPatientModel>('Patient', patientSchema);
export default Patient;