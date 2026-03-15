import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import ConsultationSession, {
	AiGenerationStatus,
	SessionStatus,
	TranscriptionStatus,
} from '../models/consultationSession.model.js';
import Patient from '../models/patient.model.js';
import Prescription from '../models/prescription.modle.js';
import ConsultationNote from '../models/consultationNote.model.js';
import LabReport from '../models/labReport.model.js';
import TranscriptSegment from '../models/transcriptSegment.model.js';
import { emitToSessionRoom } from '../utils/socket.util.js';

const asObjectIdArray = (values: unknown): mongoose.Types.ObjectId[] => {
	if (!Array.isArray(values)) return [];

	return values
		.map(String)
		.filter((id) => mongoose.Types.ObjectId.isValid(id))
		.map((id) => new mongoose.Types.ObjectId(id));
};

const requireStringParam = (value: unknown): string | null => {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed || null;
};

export const createSession = async (req: Request, res: Response) => {
	try {
		if (!req.user) {
			res.status(401).json({ message: 'Not authorized' });
			return;
		}

		const { patientId, encounterType, chiefComplaint, reasonForVisit, tags } = req.body;

		if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
			res.status(400).json({ message: 'Valid patientId is required' });
			return;
		}

		const patient = await Patient.findOne({
			_id: patientId,
			hospitalId: req.user.hospitalId,
			isDeleted: false,
		});

		if (!patient) {
			res.status(404).json({ message: 'Patient not found' });
			return;
		}

		const session = await ConsultationSession.create({
			hospitalId: req.user.hospitalId,
			patientId,
			doctorId: req.user._id,
			startedBy: req.user._id,
			encounterType,
			chiefComplaint,
			reasonForVisit,
			status: SessionStatus.READY_TO_RECORD,
			transcriptionStatus: TranscriptionStatus.NOT_STARTED,
			aiGenerationStatus: AiGenerationStatus.NOT_STARTED,
			tags: Array.isArray(tags) ? tags : [],
		});

		res.status(201).json(session);
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to create session';
		res.status(500).json({ message });
		return;
	}
};

export const getSessions = async (req: Request, res: Response) => {
	try {
		if (!req.user) {
			res.status(401).json({ message: 'Not authorized' });
			return;
		}

		const page = Math.max(Number(req.query.page || 1), 1);
		const limit = Math.min(Number(req.query.limit || 20), 100);
		const status = req.query.status ? String(req.query.status) : undefined;
		const patientId = req.query.patientId ? String(req.query.patientId) : undefined;
		const q = req.query.q ? String(req.query.q).trim() : '';

		const filter: Record<string, unknown> = {
			hospitalId: req.user.hospitalId,
			isDeleted: false,
			doctorId: req.user._id,
		};

		if (status) filter.status = status;
		if (patientId && mongoose.Types.ObjectId.isValid(patientId)) {
			filter.patientId = patientId;
		}

		if (q) {
			const matchingPatients = await Patient.find(
				{
					hospitalId: req.user.hospitalId,
					isDeleted: false,
					$or: [
						{ fullName: { $regex: q, $options: 'i' } },
						{ patientGlobalId: { $regex: q, $options: 'i' } },
					],
				},
				{ _id: 1 }
			);

			filter.patientId = { $in: matchingPatients.map((p) => p._id) };
		}

		const skip = (page - 1) * limit;

		const [items, total] = await Promise.all([
			ConsultationSession.find(filter)
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.populate('patientId', 'fullName patientGlobalId sex age')
				.populate('currentPrescriptionId')
				.populate('currentNoteId'),
			ConsultationSession.countDocuments(filter),
		]);

		res.json({
			items,
			pagination: {
				total,
				page,
				limit,
				pages: Math.ceil(total / limit),
			},
		});
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to fetch sessions';
		res.status(500).json({ message });
		return;
	}
};

export const getSessionById = async (req: Request, res: Response) => {
	try {
		if (!req.user) {
			res.status(401).json({ message: 'Not authorized' });
			return;
		}

		const id = requireStringParam(req.params.id);
		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			res.status(400).json({ message: 'Invalid session id' });
			return;
		}

		const session = await ConsultationSession.findOne({
			_id: id,
			hospitalId: req.user.hospitalId,
			doctorId: req.user._id,
			isDeleted: false,
		})
			.populate('patientId')
			.populate('doctorId', 'fullName email role')
			.populate('currentPrescriptionId')
			.populate('currentNoteId')
			.populate('linkedLabReportIds');

		if (!session) {
			res.status(404).json({ message: 'Session not found' });
			return;
		}

		res.json(session);
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to fetch session';
		res.status(500).json({ message });
		return;
	}
};

export const startSessionRecording = async (req: Request, res: Response) => {
	try {
		if (!req.user) {
			res.status(401).json({ message: 'Not authorized' });
			return;
		}

		const id = requireStringParam(req.params.id);
		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			res.status(400).json({ message: 'Invalid session id' });
			return;
		}

		const session = await ConsultationSession.findOne({
			_id: id,
			hospitalId: req.user.hospitalId,
			doctorId: req.user._id,
			isDeleted: false,
		});

		if (!session) {
			res.status(404).json({ message: 'Session not found' });
			return;
		}

		const previousStatus = session.status;

		session.status = SessionStatus.RECORDING;
		session.startedAt = session.startedAt ?? new Date();
		session.transcriptionStatus = TranscriptionStatus.IN_PROGRESS;
		await session.save();

		emitToSessionRoom(req.app, id, 'recording.started', {
			sessionId: id,
			startedAt: session.startedAt,
			doctorId: String(req.user._id),
		});
		emitToSessionRoom(req.app, id, 'session.status.changed', {
			sessionId: id,
			previousStatus,
			status: session.status,
		});

		res.json(session);
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to start recording';
		res.status(500).json({ message });
		return;
	}
};

export const stopSessionRecording = async (req: Request, res: Response) => {
	try {
		if (!req.user) {
			res.status(401).json({ message: 'Not authorized' });
			return;
		}

		const id = requireStringParam(req.params.id);
		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			res.status(400).json({ message: 'Invalid session id' });
			return;
		}

		const session = await ConsultationSession.findOne({
			_id: id,
			hospitalId: req.user.hospitalId,
			doctorId: req.user._id,
			isDeleted: false,
		});

		if (!session) {
			res.status(404).json({ message: 'Session not found' });
			return;
		}

		const previousStatus = session.status;

		const now = new Date();
		session.endedAt = now;
		if (session.startedAt) {
			session.durationSeconds = Math.max(
				0,
				Math.floor((now.getTime() - session.startedAt.getTime()) / 1000)
			);
		}
		session.status = SessionStatus.PROCESSING;
		session.transcriptionStatus = TranscriptionStatus.IN_PROGRESS;
		session.aiGenerationStatus = AiGenerationStatus.IN_PROGRESS;
		await session.save();

		emitToSessionRoom(req.app, id, 'recording.stopped', {
			sessionId: id,
			endedAt: session.endedAt,
			durationSeconds: session.durationSeconds,
		});
		emitToSessionRoom(req.app, id, 'session.status.changed', {
			sessionId: id,
			previousStatus,
			status: session.status,
		});

		res.json(session);
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to stop recording';
		res.status(500).json({ message });
		return;
	}
};

export const linkLabReportsToSession = async (req: Request, res: Response) => {
	try {
		if (!req.user) {
			res.status(401).json({ message: 'Not authorized' });
			return;
		}

		const id = requireStringParam(req.params.id);
		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			res.status(400).json({ message: 'Invalid session id' });
			return;
		}

		const session = await ConsultationSession.findOne({
			_id: id,
			hospitalId: req.user.hospitalId,
			doctorId: req.user._id,
			isDeleted: false,
		});
		if (!session) {
			res.status(404).json({ message: 'Session not found' });
			return;
		}

		const requestedIds = asObjectIdArray(req.body.labReportIds);
		if (requestedIds.length === 0) {
			res.status(400).json({ message: 'labReportIds is required' });
			return;
		}

		const reports = await LabReport.find({
			_id: { $in: requestedIds },
			hospitalId: req.user.hospitalId,
			patientId: session.patientId,
			isDeleted: false,
		});

		session.linkedLabReportIds = reports.map((report) => report._id);
		await session.save();

		emitToSessionRoom(req.app, id, 'session.lab-reports.linked', {
			sessionId: id,
			labReportIds: reports.map((report) => String(report._id)),
		});

		res.json(session);
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to link lab reports';
		res.status(500).json({ message });
		return;
	}
};

export const getSessionWorkspaceData = async (req: Request, res: Response) => {
	try {
		if (!req.user) {
			res.status(401).json({ message: 'Not authorized' });
			return;
		}

		const id = requireStringParam(req.params.id);
		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			res.status(400).json({ message: 'Invalid session id' });
			return;
		}

		const session = await ConsultationSession.findOne({
			_id: id,
			hospitalId: req.user.hospitalId,
			doctorId: req.user._id,
			isDeleted: false,
		}).populate('patientId', 'fullName patientGlobalId sex age');

		if (!session) {
			res.status(404).json({ message: 'Session not found' });
			return;
		}

		const [prescription, note, labReports, transcript] = await Promise.all([
			Prescription.findOne({
				consultationSessionId: session._id,
				hospitalId: req.user.hospitalId,
				isDeleted: false,
			}).sort({ version: -1 }),
			ConsultationNote.findOne({
				consultationSessionId: session._id,
				hospitalId: req.user.hospitalId,
			}).sort({ version: -1 }),
			LabReport.find({
				_id: { $in: session.linkedLabReportIds },
				hospitalId: req.user.hospitalId,
				isDeleted: false,
			}).sort({ collectedAt: -1, createdAt: -1 }),
			TranscriptSegment.find({
				consultationSessionId: session._id,
				hospitalId: req.user.hospitalId,
			})
				.sort({ sequenceNumber: 1 })
				.limit(500),
		]);

		res.json({
			session,
			note,
			prescription,
			labReports,
			transcript,
		});
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to fetch workspace data';
		res.status(500).json({ message });
		return;
	}
};
