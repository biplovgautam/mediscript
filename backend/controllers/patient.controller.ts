import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import Patient from '../models/patient.model.js';
import ConsultationSession from '../models/consultationSession.model.js';
import Prescription from '../models/prescription.model.js';
import LabReport from '../models/labReport.model.js';

const parseListParam = (value: unknown): string[] => {
	if (!value) return [];
	if (Array.isArray(value)) {
		return value.map(String).map((item) => item.trim()).filter(Boolean);
	}
	return String(value)
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
};

const requireStringParam = (value: unknown): string | null => {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed || null;
};

export const createPatient = async (req: Request, res: Response) => {
	try {
		if (!req.user) {
			res.status(401).json({ message: 'Not authorized' });
			return;
		}

		const {
			patientGlobalId,
			fullName,
			firstName,
			lastName,
			dob,
			age,
			sex,
			bloodGroup,
			phone,
			email,
			address,
			city,
			emergencyContactName,
			emergencyContactPhone,
			allergies,
			chronicConditions,
			currentMedications,
			notes,
		} = req.body;

		if (!patientGlobalId || !fullName) {
			res.status(400).json({
				message: 'patientGlobalId and fullName are required',
			});
			return;
		}

		const exists = await Patient.findOne({
			hospitalId: req.user.hospitalId,
			patientGlobalId: String(patientGlobalId).toUpperCase(),
			isDeleted: false,
		});

		if (exists) {
			res.status(409).json({ message: 'Patient already exists' });
			return;
		}

		const patient = await Patient.create({
			hospitalId: req.user.hospitalId,
			patientGlobalId,
			fullName,
			firstName,
			lastName,
			dob,
			age,
			sex,
			bloodGroup,
			phone,
			email,
			address,
			city,
			emergencyContactName,
			emergencyContactPhone,
			allergies: parseListParam(allergies),
			chronicConditions: parseListParam(chronicConditions),
			currentMedications: parseListParam(currentMedications),
			notes,
		});

		res.status(201).json(patient);
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to create patient';
		res.status(500).json({ message });
		return;
	}
};

export const getPatients = async (req: Request, res: Response) => {
	try {
		if (!req.user) {
			res.status(401).json({ message: 'Not authorized' });
			return;
		}

		const queryText = req.query.q ? String(req.query.q).trim() : '';
		const patientGlobalId = req.query.patientGlobalId
			? String(req.query.patientGlobalId).trim().toUpperCase()
			: '';
		const page = Number(req.query.page || 1);
		const limit = Math.min(Number(req.query.limit || 20), 100);

		const filter: Record<string, unknown> = {
			hospitalId: req.user.hospitalId,
			isDeleted: false,
		};

		if (patientGlobalId) {
			filter.patientGlobalId = patientGlobalId;
		}

		if (queryText) {
			filter.$or = [
				{ fullName: { $regex: queryText, $options: 'i' } },
				{ patientGlobalId: { $regex: queryText, $options: 'i' } },
				{ phone: { $regex: queryText, $options: 'i' } },
			];
		}

		const skip = (Math.max(page, 1) - 1) * limit;

		const [items, total] = await Promise.all([
			Patient.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit),
			Patient.countDocuments(filter),
		]);

		res.json({
			items,
			pagination: {
				total,
				page: Math.max(page, 1),
				limit,
				pages: Math.ceil(total / limit),
			},
		});
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to fetch patients';
		res.status(500).json({ message });
		return;
	}
};

export const getPatientById = async (req: Request, res: Response) => {
	try {
		if (!req.user) {
			res.status(401).json({ message: 'Not authorized' });
			return;
		}

		const id = requireStringParam(req.params.id);
		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			res.status(400).json({ message: 'Invalid patient id' });
			return;
		}

		const patient = await Patient.findOne({
			_id: id,
			hospitalId: req.user.hospitalId,
			isDeleted: false,
		});

		if (!patient) {
			res.status(404).json({ message: 'Patient not found' });
			return;
		}

		res.json(patient);
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to fetch patient';
		res.status(500).json({ message });
		return;
	}
};

export const updatePatient = async (req: Request, res: Response) => {
	try {
		if (!req.user) {
			res.status(401).json({ message: 'Not authorized' });
			return;
		}

		const id = requireStringParam(req.params.id);
		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			res.status(400).json({ message: 'Invalid patient id' });
			return;
		}

		const updatePayload = { ...req.body } as Record<string, unknown>;
		if ('allergies' in updatePayload) {
			updatePayload.allergies = parseListParam(updatePayload.allergies);
		}
		if ('chronicConditions' in updatePayload) {
			updatePayload.chronicConditions = parseListParam(updatePayload.chronicConditions);
		}
		if ('currentMedications' in updatePayload) {
			updatePayload.currentMedications = parseListParam(updatePayload.currentMedications);
		}

		const patient = await Patient.findOneAndUpdate(
			{
				_id: id,
				hospitalId: req.user.hospitalId,
				isDeleted: false,
			},
			updatePayload,
			{ new: true }
		);

		if (!patient) {
			res.status(404).json({ message: 'Patient not found' });
			return;
		}

		res.json(patient);
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to update patient';
		res.status(500).json({ message });
		return;
	}
};

export const getPatientOverview = async (req: Request, res: Response) => {
	try {
		if (!req.user) {
			res.status(401).json({ message: 'Not authorized' });
			return;
		}

		const id = requireStringParam(req.params.id);
		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			res.status(400).json({ message: 'Invalid patient id' });
			return;
		}

		const patient = await Patient.findOne({
			_id: id,
			hospitalId: req.user.hospitalId,
			isDeleted: false,
		});

		if (!patient) {
			res.status(404).json({ message: 'Patient not found' });
			return;
		}

		const [recentSessions, latestPrescription, recentLabReports] = await Promise.all([
			ConsultationSession.find({
				patientId: id,
				hospitalId: req.user.hospitalId,
				isDeleted: false,
			})
				.sort({ createdAt: -1 })
				.limit(5),
			Prescription.findOne({
				patientId: id,
				hospitalId: req.user.hospitalId,
				isDeleted: false,
			})
				.sort({ createdAt: -1 })
				.populate('consultationSessionId', 'status startedAt endedAt'),
			LabReport.find({
				patientId: id,
				hospitalId: req.user.hospitalId,
				isDeleted: false,
			})
				.sort({ collectedAt: -1, createdAt: -1 })
				.limit(10),
		]);

		res.json({
			patient,
			recentSessions,
			latestPrescription,
			recentLabReports,
		});
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to fetch patient overview';
		res.status(500).json({ message });
		return;
	}
};
