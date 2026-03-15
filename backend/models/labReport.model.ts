import mongoose, { Document, Model, Schema } from 'mongoose';
import type { IHospital } from './hospital.model.js';
import type { IPatient } from './patient.model.js';
import type { IConsultationSession } from './consultationSession.model.js';
import type { IUploadedDocument } from './uploadedDocument.model.js';

export enum SourceType {
  MANUAL_ENTRY = 'MANUAL_ENTRY',
  OCR_IMPORT = 'OCR_IMPORT',
  EXTERNAL_LIS = 'EXTERNAL_LIS',
}

export enum Flag {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
  UNKNOWN = 'UNKNOWN',
}

// Subdocument interface for lab result row
export interface ILabResultRow {
  testName: string;
  method?: string;
  resultValue: string;
  numericValue?: number;
  unit?: string;
  refRangeText?: string;
  refMin?: number;
  refMax?: number;
  flag: Flag;
  remarks?: string;
  displayOrder: number;
}

const labResultRowSchema = new Schema<ILabResultRow>({
  testName: { type: String, required: true },
  method: String,
  resultValue: { type: String, required: true },
  numericValue: Number,
  unit: String,
  refRangeText: String,
  refMin: Number,
  refMax: Number,
  flag: {
    type: String,
    enum: Object.values(Flag),
    default: Flag.UNKNOWN,
  },
  remarks: String,
  displayOrder: { type: Number, default: 0 },
});

export interface ILabReport extends Document {
  hospitalId: IHospital['_id'];
  patientId: IPatient['_id'];
  consultationSessionId?: IConsultationSession['_id'];
  uploadedDocumentId?: IUploadedDocument['_id'];
  reportNumber?: string;
  orderNumber?: string;
  crNumber?: string;
  opdIpdNumber?: string;
  panelName: string;
  department: string;
  referredDoctorName?: string;
  corporateName?: string;
  orderedAt?: Date;
  collectedAt?: Date;
  receivedAt?: Date;
  approvedAt?: Date;
  approvalLevel?: string;
  barcodeValue?: string;
  qrCodeValue?: string;
  remarks?: string;
  clinicalInterpretation?: string;
  pdfUrl?: string;
  sourceType: SourceType;
  results: ILabResultRow[];
  abnormalCount: number;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILabReportModel extends Model<ILabReport> {}

const labReportSchema = new Schema<ILabReport>(
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
    uploadedDocumentId: {
      type: Schema.Types.ObjectId,
      ref: 'UploadedDocument',
    },
    reportNumber: String,
    orderNumber: String,
    crNumber: String,
    opdIpdNumber: String,
    panelName: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    referredDoctorName: String,
    corporateName: String,
    orderedAt: Date,
    collectedAt: Date,
    receivedAt: Date,
    approvedAt: Date,
    approvalLevel: String,
    barcodeValue: String,
    qrCodeValue: String,
    remarks: String,
    clinicalInterpretation: String,
    pdfUrl: String,
    sourceType: {
      type: String,
      enum: Object.values(SourceType),
      default: SourceType.MANUAL_ENTRY,
    },
    results: [labResultRowSchema],
    abnormalCount: {
      type: Number,
      default: 0,
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
labReportSchema.index({ patientId: 1, collectedAt: 1 });
labReportSchema.index({ consultationSessionId: 1 });
labReportSchema.index({ hospitalId: 1, reportNumber: 1 });
labReportSchema.index({ panelName: 1 });

const LabReport = mongoose.model<ILabReport, ILabReportModel>('LabReport', labReportSchema);
export default LabReport;