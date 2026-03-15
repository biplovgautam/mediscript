import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import Prescription, {
	type IMedication,
	PrescriptionStatus,
} from '../models/prescription.model.js';
import ConsultationSession, {
	SessionStatus,
} from '../models/consultationSession.model.js';
import { emitToSessionRoom } from '../utils/socket.util.js';

const normalizeItems = (items: unknown): IMedication[] => {
	if (!Array.isArray(items)) return [];

	const normalizeBeforeAfterFood = (value: unknown): IMedication['beforeAfterFood'] | undefined => {
		if (typeof value !== 'string') return undefined;

		const normalized = value.trim().toUpperCase().replace(/[-\s]+/g, '_');
		if (normalized === 'BEFORE') return 'BEFORE_FOOD' as IMedication['beforeAfterFood'];
		if (normalized === 'AFTER') return 'AFTER_FOOD' as IMedication['beforeAfterFood'];
		if (normalized === 'WITH') return 'WITH_FOOD' as IMedication['beforeAfterFood'];
		if (normalized === 'ANY') return 'ANYTIME' as IMedication['beforeAfterFood'];

		const allowed = ['BEFORE_FOOD', 'AFTER_FOOD', 'WITH_FOOD', 'ANYTIME'];
		return allowed.includes(normalized)
			? (normalized as IMedication['beforeAfterFood'])
			: undefined;
	};

	const normalized: IMedication[] = [];

	items.forEach((item, index) => {
		const data = item as Partial<IMedication>;
		if (!data.medicineName) return;

		const medication = {
			medicineName: String(data.medicineName),
			displayOrder: data.displayOrder ?? index,
		} as IMedication;

		if (data.genericName !== undefined) medication.genericName = data.genericName;
		if (data.strength !== undefined) medication.strength = data.strength;
		if (data.dosageForm !== undefined) medication.dosageForm = data.dosageForm;
		if (data.route !== undefined) medication.route = data.route;
		if (data.dose !== undefined) medication.dose = data.dose;
		if (data.frequency !== undefined) medication.frequency = data.frequency;
		if (data.durationDays !== undefined) medication.durationDays = data.durationDays;
		if (data.durationText !== undefined) medication.durationText = data.durationText;
		if (data.quantity !== undefined) medication.quantity = data.quantity;
		if (data.instructions !== undefined) medication.instructions = data.instructions;
		if (data.beforeAfterFood !== undefined) {
			const mealTiming = normalizeBeforeAfterFood(data.beforeAfterFood);
			if (mealTiming) medication.beforeAfterFood = mealTiming;
		}

		normalized.push(medication);
	});

	return normalized;
};

const requireStringParam = (value: unknown): string | null => {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed || null;
};

export const generatePrescriptionDraft = async (req: Request, res: Response) => {
	try {
		if (!req.user) {
			res.status(401).json({ message: 'Not authorized' });
			return;
		}

		const { sessionId, diagnosisText, advice, followUp, warnings, items, consultationNoteId } = req.body;
		if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
			res.status(400).json({ message: 'Valid sessionId is required' });
			return;
		}

		const session = await ConsultationSession.findOne({
			_id: sessionId,
			hospitalId: req.user.hospitalId,
			doctorId: req.user._id,
			isDeleted: false,
		});
		if (!session) {
			res.status(404).json({ message: 'Session not found' });
			return;
		}

		const previousVersion = await Prescription.findOne({
			consultationSessionId: session._id,
			hospitalId: req.user.hospitalId,
			isDeleted: false,
		}).sort({ version: -1 });

		const prescription = await Prescription.create({
			hospitalId: req.user.hospitalId,
			consultationSessionId: session._id,
			patientId: session.patientId,
			doctorId: req.user._id,
			consultationNoteId,
			version: (previousVersion?.version || 0) + 1,
			status: PrescriptionStatus.AI_DRAFT,
			diagnosisText,
			advice,
			followUp,
			warnings: Array.isArray(warnings) ? warnings : [],
			items: normalizeItems(items),
			generatedAt: new Date(),
		});

		session.currentPrescriptionId = prescription._id;
		session.status = SessionStatus.GENERATED;
		await session.save();

		emitToSessionRoom(req.app, sessionId, 'prescription.draft.generated', {
			sessionId,
			prescriptionId: String(prescription._id),
			status: prescription.status,
			version: prescription.version,
		});

		res.status(201).json(prescription);
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to generate prescription';
		res.status(500).json({ message });
		return;
	}
};

export const getLatestPrescriptionBySession = async (req: Request, res: Response) => {
	try {
		if (!req.user) {
			res.status(401).json({ message: 'Not authorized' });
			return;
		}

		const sessionId = requireStringParam(req.params.sessionId);
		if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
			res.status(400).json({ message: 'Invalid session id' });
			return;
		}

		const prescription = await Prescription.findOne({
			consultationSessionId: sessionId,
			hospitalId: req.user.hospitalId,
			isDeleted: false,
		}).sort({ version: -1 });

		if (!prescription) {
			res.status(404).json({ message: 'Prescription not found' });
			return;
		}

		res.json(prescription);
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to fetch prescription';
		res.status(500).json({ message });
		return;
	}
};

export const updatePrescription = async (req: Request, res: Response) => {
	try {
		if (!req.user) {
			res.status(401).json({ message: 'Not authorized' });
			return;
		}

		const id = requireStringParam(req.params.id);
		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			res.status(400).json({ message: 'Invalid prescription id' });
			return;
		}

		const updatePayload = {
			...req.body,
			status: PrescriptionStatus.DOCTOR_EDITED,
		} as Record<string, unknown>;

		if (req.body.items) {
			updatePayload.items = normalizeItems(req.body.items);
		}

		const prescription = await Prescription.findOneAndUpdate(
			{
				_id: id,
				hospitalId: req.user.hospitalId,
				doctorId: req.user._id,
				isDeleted: false,
			},
			updatePayload,
			{
				new: true,
			}
		);

		if (!prescription) {
			res.status(404).json({ message: 'Prescription not found' });
			return;
		}

		res.json(prescription);
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to update prescription';
		res.status(500).json({ message });
		return;
	}
};

export const updateLatestPrescriptionBySession = async (req: Request, res: Response) => {
	try {
		if (!req.user) {
			res.status(401).json({ message: 'Not authorized' });
			return;
		}

		const sessionId = requireStringParam(req.params.sessionId);
		if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
			res.status(400).json({ message: 'Invalid session id' });
			return;
		}

		const latestPrescription = await Prescription.findOne({
			consultationSessionId: sessionId,
			hospitalId: req.user.hospitalId,
			doctorId: req.user._id,
			isDeleted: false,
		})
			.sort({ version: -1 })
			.select('_id');

		if (!latestPrescription) {
			res.status(404).json({ message: 'Prescription not found' });
			return;
		}

		const updatePayload = {
			...req.body,
			status: PrescriptionStatus.DOCTOR_EDITED,
		} as Record<string, unknown>;

		if (req.body.items) {
			updatePayload.items = normalizeItems(req.body.items);
		}

		const prescription = await Prescription.findOneAndUpdate(
			{
				_id: latestPrescription._id,
				hospitalId: req.user.hospitalId,
				doctorId: req.user._id,
				isDeleted: false,
			},
			updatePayload,
			{
				new: true,
			}
		);

		if (!prescription) {
			res.status(404).json({ message: 'Prescription not found' });
			return;
		}

		res.json(prescription);
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to update prescription';
		res.status(500).json({ message });
		return;
	}
};

export const finalizePrescription = async (req: Request, res: Response) => {
	try {
		if (!req.user) {
			res.status(401).json({ message: 'Not authorized' });
			return;
		}

		const id = requireStringParam(req.params.id);
		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			res.status(400).json({ message: 'Invalid prescription id' });
			return;
		}

		const prescription = await Prescription.findOne({
			_id: id,
			hospitalId: req.user.hospitalId,
			doctorId: req.user._id,
			isDeleted: false,
		});

		if (!prescription) {
			res.status(404).json({ message: 'Prescription not found' });
			return;
		}

		prescription.status = PrescriptionStatus.FINALIZED;
		prescription.finalizedBy = new mongoose.Types.ObjectId(String(req.user._id));
		prescription.finalizedAt = new Date();
		await prescription.save();

		const session = await ConsultationSession.findById(prescription.consultationSessionId);
		if (session) {
			session.currentPrescriptionId = prescription._id;
			session.status = SessionStatus.COMPLETED;
			await session.save();
			emitToSessionRoom(req.app, String(session._id), 'session.status.changed', {
				sessionId: String(session._id),
				status: session.status,
			});
		}

		emitToSessionRoom(req.app, String(prescription.consultationSessionId), 'prescription.finalized', {
			sessionId: String(prescription.consultationSessionId),
			prescriptionId: String(prescription._id),
			status: prescription.status,
			finalizedAt: prescription.finalizedAt,
		});

		res.json(prescription);
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to finalize prescription';
		res.status(500).json({ message });
		return;
	}
};

export const finalizeLatestPrescriptionBySession = async (req: Request, res: Response) => {
	try {
		if (!req.user) {
			res.status(401).json({ message: 'Not authorized' });
			return;
		}

		const sessionId = requireStringParam(req.params.sessionId);
		if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
			res.status(400).json({ message: 'Invalid session id' });
			return;
		}

		const prescription = await Prescription.findOne({
			consultationSessionId: sessionId,
			hospitalId: req.user.hospitalId,
			doctorId: req.user._id,
			isDeleted: false,
		}).sort({ version: -1 });

		if (!prescription) {
			res.status(404).json({ message: 'Prescription not found' });
			return;
		}

		prescription.status = PrescriptionStatus.FINALIZED;
		prescription.finalizedBy = new mongoose.Types.ObjectId(String(req.user._id));
		prescription.finalizedAt = new Date();
		await prescription.save();

		const session = await ConsultationSession.findById(prescription.consultationSessionId);
		if (session) {
			session.currentPrescriptionId = prescription._id;
			session.status = SessionStatus.COMPLETED;
			await session.save();
			emitToSessionRoom(req.app, String(session._id), 'session.status.changed', {
				sessionId: String(session._id),
				status: session.status,
			});
		}

		emitToSessionRoom(req.app, String(prescription.consultationSessionId), 'prescription.finalized', {
			sessionId: String(prescription.consultationSessionId),
			prescriptionId: String(prescription._id),
			status: prescription.status,
			finalizedAt: prescription.finalizedAt,
		});

		res.json(prescription);
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to finalize prescription';
		res.status(500).json({ message });
		return;
	}
};
