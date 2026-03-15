import mongoose, { Document, Model, Schema } from 'mongoose';
import type { IHospital } from './hospital.model.js';
import type { IUser } from './user.model.js';

export enum EntityType {
  HOSPITAL = 'HOSPITAL',
  USER = 'USER',
  PATIENT = 'PATIENT',
  CONSULTATION_SESSION = 'CONSULTATION_SESSION',
  AUDIO_RECORDING = 'AUDIO_RECORDING',
  TRANSCRIPT_SEGMENT = 'TRANSCRIPT_SEGMENT',
  CONSULTATION_NOTE = 'CONSULTATION_NOTE',
  PRESCRIPTION = 'PRESCRIPTION',
  LAB_REPORT = 'LAB_REPORT',
  UPLOADED_DOCUMENT = 'UPLOADED_DOCUMENT',
}

export enum Action {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  VIEW = 'VIEW',
  EXPORT_PDF = 'EXPORT_PDF',
  LOGIN = 'LOGIN',
  DOWNLOAD = 'DOWNLOAD',
}

export interface IAuditLog extends Document {
  hospitalId: IHospital['_id'];
  actorUserId?: IUser['_id'];
  entityType: EntityType;
  entityId: mongoose.Types.ObjectId;
  action: Action;
  description?: string;
  before?: any;    // Mixed
  after?: any;     // Mixed
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAuditLogModel extends Model<IAuditLog> {}

const auditLogSchema = new Schema<IAuditLog>(
  {
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
    },
    actorUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    entityType: {
      type: String,
      enum: Object.values(EntityType),
      required: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    action: {
      type: String,
      enum: Object.values(Action),
      required: true,
    },
    description: String,
    before: {
      type: Schema.Types.Mixed,
    },
    after: {
      type: Schema.Types.Mixed,
    },
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ actorUserId: 1, createdAt: 1 });
auditLogSchema.index({ hospitalId: 1, createdAt: 1 });

const AuditLog = mongoose.model<IAuditLog, IAuditLogModel>('AuditLog', auditLogSchema);
export default AuditLog;