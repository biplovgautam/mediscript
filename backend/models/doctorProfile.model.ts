import mongoose, { Document, Model, Schema } from 'mongoose';
import type { IUser } from './user.model.js';
import type { IHospital } from './hospital.model.js';

export interface IDoctorProfile extends Document {
  userId: IUser['_id'];
  hospitalId: IHospital['_id'];
  specialization: string;
  department?: string;
  qualification?: string;
  medicalLicenseNumber?: string;
  yearsOfExperience?: number;
  signatureImageUrl?: string;
  consultationFee?: number;
  bio?: string;
  aiSettings: {
    autoGenerateSummary: boolean;
    liveTranscription: boolean;
    diagnosisSuggestions: boolean;
    prescriptionSuggestions: boolean;
  };
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDoctorProfileModel extends Model<IDoctorProfile> {}

const doctorProfileSchema = new Schema<IDoctorProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
    },
    specialization: {
      type: String,
      required: true,
    },
    department: String,
    qualification: String,
    medicalLicenseNumber: String,
    yearsOfExperience: Number,
    signatureImageUrl: String,
    consultationFee: Number,
    bio: String,
    aiSettings: {
      autoGenerateSummary: { type: Boolean, default: true },
      liveTranscription: { type: Boolean, default: true },
      diagnosisSuggestions: { type: Boolean, default: true },
      prescriptionSuggestions: { type: Boolean, default: true },
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
doctorProfileSchema.index({ hospitalId: 1, specialization: 1 });

const DoctorProfile = mongoose.model<IDoctorProfile, IDoctorProfileModel>(
  'DoctorProfile',
  doctorProfileSchema
);
export default DoctorProfile;