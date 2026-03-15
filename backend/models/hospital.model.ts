import mongoose, { Document, Model, Schema } from 'mongoose';

// Enum for common timezones (simplified)
export enum Timezone {
  ASIA_KATHMANDU = 'Asia/Kathmandu',
  ASIA_KOLKATA = 'Asia/Kolkata',
  UTC = 'UTC',
  // add others as needed
}

export interface IHospital extends Document {
  name: string;
  code: string;                // unique, uppercase
  registrationNumber?: string;
  phone?: string;
  email?: string;
  website?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  timezone: string;
  logoUrl?: string;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IHospitalModel extends Model<IHospital> {}

const hospitalSchema = new Schema<IHospital>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      unique: true,
    },
    registrationNumber: {
      type: String,
    },
    phone: String,
    email: {
      type: String,
      lowercase: true,
    },
    website: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
    timezone: {
      type: String,
      default: 'Asia/Kathmandu',
    },
    logoUrl: String,
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

// Indexes
hospitalSchema.index({ name: 1 });
// code is already unique by schema

const Hospital = mongoose.model<IHospital, IHospitalModel>('Hospital', hospitalSchema);
export default Hospital;