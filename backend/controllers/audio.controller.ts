import type { Request, Response } from 'express';
import path from 'path';
import mongoose from 'mongoose';
import ConsultationSession, {
	SessionStatus,
	TranscriptionStatus,
} from '../models/consultationSession.model.js';
import AudioRecording, { TranscriptStatus } from '../models/audioRecording.model.js';
import TranscriptSegment, {
	SpeakerRole,
	TranscriptSource,
} from '../models/transcriptSegment.model.js';
import { emitToSessionRoom } from '../utils/socket.util.js';

const requireStringParam = (value: unknown): string | null => {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed || null;
};

export const uploadSessionAudio = async (req: Request, res: Response) => {
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

		if (!req.file) {
			res.status(400).json({ message: 'Audio file is required' });
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

		const existingRecording = await AudioRecording.findOne({
			consultationSessionId: session._id,
			hospitalId: req.user.hospitalId,
		});
		if (existingRecording && existingRecording.transcriptStatus !== TranscriptStatus.FAILED) {
			res.status(409).json({
				message: 'Audio already uploaded for this session',
			});
			return;
		}

		const fileUrl = `/${req.file.path.replace(/\\/g, '/')}`;

		const recording = existingRecording
			? await AudioRecording.findByIdAndUpdate(
					existingRecording._id,
					{
						fileUrl,
						originalFileName: req.file.originalname,
						mimeType: req.file.mimetype,
						fileSizeBytes: req.file.size,
						storageKey: path.basename(req.file.path),
						transcriptStatus: TranscriptStatus.PENDING,
						processingStartedAt: undefined,
						processingCompletedAt: undefined,
						errorMessage: undefined,
					},
					{ new: true }
				)
			: await AudioRecording.create({
					hospitalId: req.user.hospitalId,
					consultationSessionId: session._id,
					patientId: session.patientId,
					doctorId: req.user._id,
					fileUrl,
					originalFileName: req.file.originalname,
					mimeType: req.file.mimetype,
					fileSizeBytes: req.file.size,
					storageKey: path.basename(req.file.path),
					transcriptStatus: TranscriptStatus.PENDING,
				});

		session.status = SessionStatus.PROCESSING;
		session.transcriptionStatus = TranscriptionStatus.IN_PROGRESS;
		await session.save();

		emitToSessionRoom(req.app, sessionId, 'audio.uploaded', {
			sessionId,
			recordingId: recording ? String(recording._id) : null,
			transcriptStatus: recording?.transcriptStatus,
		});
		emitToSessionRoom(req.app, sessionId, 'session.status.changed', {
			sessionId,
			status: session.status,
		});

		res.status(201).json(recording);
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to upload audio';
		res.status(500).json({ message });
		return;
	}
};

export const getSessionAudio = async (req: Request, res: Response) => {
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

		const recording = await AudioRecording.findOne({
			consultationSessionId: sessionId,
			hospitalId: req.user.hospitalId,
		});

		if (!recording) {
			res.status(404).json({ message: 'Audio not found' });
			return;
		}

		res.json(recording);
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to fetch audio';
		res.status(500).json({ message });
		return;
	}
};

export const updateTranscriptStatus = async (req: Request, res: Response) => {
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

		const { transcriptStatus, errorMessage } = req.body as {
			transcriptStatus?: TranscriptStatus;
			errorMessage?: string;
		};

		if (!transcriptStatus || !Object.values(TranscriptStatus).includes(transcriptStatus)) {
			res.status(400).json({ message: 'Invalid transcriptStatus' });
			return;
		}

		const recording = await AudioRecording.findOneAndUpdate(
			{
				consultationSessionId: sessionId,
				hospitalId: req.user.hospitalId,
			},
			{
				transcriptStatus,
				errorMessage,
				processingStartedAt:
					transcriptStatus === TranscriptStatus.PROCESSING ? new Date() : undefined,
				processingCompletedAt:
					transcriptStatus === TranscriptStatus.COMPLETED || transcriptStatus === TranscriptStatus.FAILED
						? new Date()
						: undefined,
			},
			{ new: true }
		);

		if (!recording) {
			res.status(404).json({ message: 'Audio not found' });
			return;
		}

		const session = await ConsultationSession.findOne({
			_id: sessionId,
			hospitalId: req.user.hospitalId,
			isDeleted: false,
		});

		if (session) {
			if (transcriptStatus === TranscriptStatus.COMPLETED) {
				session.transcriptionStatus = TranscriptionStatus.COMPLETED;
			} else if (transcriptStatus === TranscriptStatus.FAILED) {
				session.transcriptionStatus = TranscriptionStatus.FAILED;
			} else if (transcriptStatus === TranscriptStatus.PROCESSING) {
				session.transcriptionStatus = TranscriptionStatus.IN_PROGRESS;
			}
			await session.save();
		}

		emitToSessionRoom(req.app, sessionId, 'transcript.status.updated', {
			sessionId,
			transcriptStatus,
			errorMessage,
		});
		if (transcriptStatus === TranscriptStatus.COMPLETED) {
			emitToSessionRoom(req.app, sessionId, 'transcript.completed', { sessionId });
		}
		if (transcriptStatus === TranscriptStatus.FAILED) {
			emitToSessionRoom(req.app, sessionId, 'transcript.failed', {
				sessionId,
				errorMessage,
			});
		}

		res.json(recording);
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to update transcript status';
		res.status(500).json({ message });
		return;
	}
};

export const appendTranscriptChunk = async (req: Request, res: Response) => {
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

		const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
		if (!text) {
			res.status(400).json({ message: 'text is required' });
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

		const lastSegment = await TranscriptSegment.findOne({
			consultationSessionId: session._id,
			hospitalId: req.user.hospitalId,
		}).sort({ sequenceNumber: -1 });

		const speakerRole = Object.values(SpeakerRole).includes(req.body.speakerRole)
			? req.body.speakerRole
			: SpeakerRole.UNKNOWN;
		const source = Object.values(TranscriptSource).includes(req.body.source)
			? req.body.source
			: TranscriptSource.AI;

		const recording = await AudioRecording.findOne({
			consultationSessionId: session._id,
			hospitalId: req.user.hospitalId,
		});

		const segmentPayload: Record<string, unknown> = {
			hospitalId: req.user.hospitalId,
			consultationSessionId: session._id,
			sequenceNumber: (lastSegment?.sequenceNumber || 0) + 1,
			speakerRole,
			speakerLabel: req.body.speakerLabel,
			text,
			startMs: req.body.startMs,
			endMs: req.body.endMs,
			confidence: req.body.confidence,
			source,
		};
		if (recording?._id) {
			segmentPayload.audioRecordingId = recording._id;
		}

		const segment = await TranscriptSegment.create(segmentPayload);

		emitToSessionRoom(req.app, sessionId, 'transcript.chunk', {
			sessionId,
			segment,
		});

		res.status(201).json(segment);
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to append transcript chunk';
		res.status(500).json({ message });
		return;
	}
};
