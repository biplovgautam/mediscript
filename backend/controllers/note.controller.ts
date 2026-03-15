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
		const inferredSymptoms = splitSymptoms(chiefComplaint || transcriptText);

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

		if (!note) {
			res.status(404).json({ message: 'Note not found' });
			return;
		}

		note.status = NoteStatus.FINALIZED;
		note.finalizedAt = new Date();
		note.finalizedBy = new mongoose.Types.ObjectId(String(req.user._id));
		await note.save();

		const session = await ConsultationSession.findById(note.consultationSessionId);
		if (session) {
			session.currentNoteId = note._id;
			session.status = SessionStatus.REVIEWED;
			await session.save();
			emitToSessionRoom(req.app, String(session._id), 'session.status.changed', {
				sessionId: String(session._id),
				status: session.status,
			});
		}

		emitToSessionRoom(req.app, String(note.consultationSessionId), 'note.finalized', {
			sessionId: String(note.consultationSessionId),
			noteId: String(note._id),
			status: note.status,
			finalizedAt: note.finalizedAt,
		});

		res.json(note);
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to finalize note';
		res.status(500).json({ message });
		return;
	}
};
