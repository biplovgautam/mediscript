import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import ConsultationNote, {
	NoteSource,
	NoteStatus,
} from '../models/consultationNote.model.js';
import ConsultationSession, {
	AiGenerationStatus,
	SessionStatus,
} from '../models/consultationSession.model.js';
import TranscriptSegment from '../models/transcriptSegment.model.js';
import Prescription, { PrescriptionStatus } from '../models/prescription.model.js';
import { emitToSessionRoom } from '../utils/socket.util.js';

const requireStringParam = (value: unknown): string | null => {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed || null;
};

const splitSymptoms = (text: string): string[] =>
	text
		.split(/[.;\n]/)
		.map((item) => item.trim())
		.filter(Boolean)
		.slice(0, 8);

export const generateNoteDraft = async (req: Request, res: Response) => {
	try {
		if (!req.user) {
			res.status(401).json({ message: 'Not authorized' });
			return;
		}

		const { sessionId, chiefComplaint, medicalHistory, examinationFindings, doctorNotes } = req.body;

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

		const transcript = await TranscriptSegment.find(
			{
				consultationSessionId: session._id,
				hospitalId: req.user.hospitalId,
			},
			{ text: 1 }
		)
			.sort({ sequenceNumber: 1 })
			.limit(200);

		const transcriptText = transcript.map((segment) => segment.text).join(' ');
		let inferredSymptoms = splitSymptoms(chiefComplaint || transcriptText);
		if (Array.isArray(req.body.symptoms) && req.body.symptoms.length > 0) {
			inferredSymptoms = req.body.symptoms.map((item: unknown) => String(item)).filter(Boolean).slice(0, 12);
		} else if (typeof req.body.symptoms === 'string' && req.body.symptoms.trim()) {
			inferredSymptoms = splitSymptoms(req.body.symptoms);
		}

		const previousVersion = await ConsultationNote.findOne({
			consultationSessionId: session._id,
			hospitalId: req.user.hospitalId,
		}).sort({ version: -1 });

		const note = await ConsultationNote.create({
			hospitalId: req.user.hospitalId,
			consultationSessionId: session._id,
			patientId: session.patientId,
			doctorId: req.user._id,
			version: (previousVersion?.version || 0) + 1,
			source: NoteSource.AI,
			status: NoteStatus.REVIEW_REQUIRED,
			chiefComplaint: chiefComplaint || session.chiefComplaint,
			symptoms: inferredSymptoms,
			medicalHistory,
			examinationFindings,
			assessment: req.body.assessment,
			diagnosisSummary: req.body.diagnosisSummary,
			plan: req.body.plan,
			followUpInstructions: req.body.followUpInstructions,
			doctorNotes,
			aiModelName: 'mediscript-mvp-v1',
			aiConfidence: 0.72,
			generatedAt: new Date(),
			rawAiPayload: {
				transcriptSampleSize: transcript.length,
			},
		});

		session.currentNoteId = note._id;
		session.aiGenerationStatus = AiGenerationStatus.COMPLETED;
		session.status = SessionStatus.GENERATED;
		await session.save();

		emitToSessionRoom(req.app, sessionId, 'note.draft.generated', {
			sessionId,
			noteId: String(note._id),
			version: note.version,
			status: note.status,
		});

		res.status(201).json(note);
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to generate consultation note';
		res.status(500).json({ message });
		return;
	}
};

export const generateAiDraftFromTranscript = async (req: Request, res: Response) => {
	try {
		if (!req.user) {
			res.status(401).json({ message: 'Not authorized' });
			return;
		}

		const sessionId = req.body?.sessionId || req.params.sessionId;
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

		const transcript = await TranscriptSegment.find(
			{
				consultationSessionId: session._id,
				hospitalId: req.user.hospitalId,
			},
			{ text: 1 }
		)
			.sort({ sequenceNumber: 1 })
			.limit(500);

		const transcriptText = transcript.map((segment) => segment.text).join(' ');
		const AI_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

		const aiResponse = await fetch(`${AI_URL}/api/ai/insights`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ transcript: transcriptText }),
		});

		if (!aiResponse.ok) {
			const errorText = await aiResponse.text();
			res.status(502).json({ message: `AI insights failed: ${errorText}` });
			return;
		}

		const aiPayload = (await aiResponse.json()) as {
			analysis?: {
				notes?: string;
				symptoms?: string;
				examination?: string;
				issues?: string;
				plan?: string;
				advice?: string;
			};
		};

		const analysis = aiPayload.analysis || {};
		const symptoms = analysis.symptoms ? splitSymptoms(analysis.symptoms) : [];
		const safePlan =
			analysis.plan && String(analysis.plan).trim()
				? analysis.plan
				: 'Review current medications, assess adherence, consider ophthalmology review, and schedule follow-up.';
		const safeAdvice =
			analysis.advice && String(analysis.advice).trim()
				? analysis.advice
				: 'Continue medications as prescribed, avoid self-adjusting treatment, and return if symptoms worsen.';

		const previousNote = await ConsultationNote.findOne({
			consultationSessionId: session._id,
			hospitalId: req.user.hospitalId,
		}).sort({ version: -1 });

		const note = await ConsultationNote.create({
			hospitalId: req.user.hospitalId,
			consultationSessionId: session._id,
			patientId: session.patientId,
			doctorId: req.user._id,
			version: (previousNote?.version || 0) + 1,
			source: NoteSource.AI,
			status: NoteStatus.REVIEW_REQUIRED,
			chiefComplaint: session.chiefComplaint,
			symptoms,
			examinationFindings: analysis.examination,
			diagnosisSummary: analysis.issues,
			plan: safePlan,
			followUpInstructions: safeAdvice,
			doctorNotes: analysis.notes,
			aiModelName: 'groq-chat',
			aiConfidence: 0.72,
			generatedAt: new Date(),
			rawAiPayload: {
				transcriptSampleSize: transcript.length,
			},
		});

		const previousPrescription = await Prescription.findOne({
			consultationSessionId: session._id,
			hospitalId: req.user.hospitalId,
			isDeleted: false,
		}).sort({ version: -1 });

		const prescription = await Prescription.create({
			hospitalId: req.user.hospitalId,
			consultationSessionId: session._id,
			patientId: session.patientId,
			doctorId: req.user._id,
			consultationNoteId: note._id,
			version: (previousPrescription?.version || 0) + 1,
			status: PrescriptionStatus.AI_DRAFT,
			diagnosisText: analysis.issues,
			advice: safeAdvice,
			followUp: '',
			warnings: [],
			items: [],
			generatedAt: new Date(),
		});

		session.currentNoteId = note._id;
		session.currentPrescriptionId = prescription._id;
		session.aiGenerationStatus = AiGenerationStatus.COMPLETED;
		session.status = SessionStatus.GENERATED;
		await session.save();

		emitToSessionRoom(req.app, sessionId, 'note.draft.generated', {
			sessionId,
			noteId: String(note._id),
			version: note.version,
			status: note.status,
		});
		emitToSessionRoom(req.app, sessionId, 'prescription.draft.generated', {
			sessionId,
			prescriptionId: String(prescription._id),
			status: prescription.status,
			version: prescription.version,
		});

		res.status(201).json({ note, prescription, analysis });
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to generate AI draft';
		res.status(500).json({ message });
		return;
	}
};

export const getLatestNoteBySession = async (req: Request, res: Response) => {
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

		const note = await ConsultationNote.findOne({
			consultationSessionId: sessionId,
			hospitalId: req.user.hospitalId,
		}).sort({ version: -1 });

		if (!note) {
			res.status(404).json({ message: 'Note not found' });
			return;
		}

		res.json(note);
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to fetch note';
		res.status(500).json({ message });
		return;
	}
};

export const updateNote = async (req: Request, res: Response) => {
	try {
		if (!req.user) {
			res.status(401).json({ message: 'Not authorized' });
			return;
		}

		const id = requireStringParam(req.params.id);
		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			res.status(400).json({ message: 'Invalid note id' });
			return;
		}

		const note = await ConsultationNote.findOneAndUpdate(
			{
				_id: id,
				hospitalId: req.user.hospitalId,
				doctorId: req.user._id,
			},
			{
				...req.body,
				source: NoteSource.MIXED,
			},
			{
				new: true,
			}
		);

		if (!note) {
			res.status(404).json({ message: 'Note not found' });
			return;
		}

		res.json(note);
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to update note';
		res.status(500).json({ message });
		return;
	}
};

export const updateLatestNoteBySession = async (req: Request, res: Response) => {
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

		const latestNote = await ConsultationNote.findOne({
			consultationSessionId: sessionId,
			hospitalId: req.user.hospitalId,
		})
			.sort({ version: -1 })
			.select('_id');

		if (!latestNote) {
			res.status(404).json({ message: 'Note not found' });
			return;
		}

		const note = await ConsultationNote.findOneAndUpdate(
			{
				_id: latestNote._id,
				hospitalId: req.user.hospitalId,
			},
			{
				...req.body,
				source: NoteSource.MIXED,
			},
			{
				new: true,
			}
		);

		if (!note) {
			res.status(404).json({ message: 'Note not found' });
			return;
		}

		res.json(note);
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to update note';
		res.status(500).json({ message });
		return;
	}
};

export const finalizeNote = async (req: Request, res: Response) => {
	try {
		if (!req.user) {
			res.status(401).json({ message: 'Not authorized' });
			return;
		}

		const id = requireStringParam(req.params.id);
		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			res.status(400).json({ message: 'Invalid note id' });
			return;
		}

		const note = await ConsultationNote.findOne({
			_id: id,
			hospitalId: req.user.hospitalId,
			doctorId: req.user._id,
		});

		const noteToFinalize =
			note ||
			(await ConsultationNote.findOne({
				consultationSessionId: id,
				hospitalId: req.user.hospitalId,
				doctorId: req.user._id,
			}).sort({ version: -1 }));

		if (!noteToFinalize) {
			res.status(404).json({ message: 'Note not found for the provided noteId/sessionId' });
			return;
		}

		noteToFinalize.status = NoteStatus.FINALIZED;
		noteToFinalize.finalizedAt = new Date();
		noteToFinalize.finalizedBy = new mongoose.Types.ObjectId(String(req.user._id));
		await noteToFinalize.save();

		const session = await ConsultationSession.findById(noteToFinalize.consultationSessionId);
		if (session) {
			session.currentNoteId = noteToFinalize._id;
			session.status = SessionStatus.REVIEWED;
			await session.save();
			emitToSessionRoom(req.app, String(session._id), 'session.status.changed', {
				sessionId: String(session._id),
				status: session.status,
			});
		}

		emitToSessionRoom(req.app, String(noteToFinalize.consultationSessionId), 'note.finalized', {
			sessionId: String(noteToFinalize.consultationSessionId),
			noteId: String(noteToFinalize._id),
			status: noteToFinalize.status,
			finalizedAt: noteToFinalize.finalizedAt,
		});

		res.json(noteToFinalize);
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to finalize note';
		res.status(500).json({ message });
		return;
	}
};
