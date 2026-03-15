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
import fsPromises from 'fs/promises';

const requireStringParam = (value: unknown): string | null => {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed || null;
};

export const uploadSessionAudio = async (req: Request, res: Response) => {
	try {
		const requestId = (req as Request & { requestId?: string }).requestId;
		console.log(`[audio.upload][${requestId ?? 'n/a'}] Incoming upload request`);
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
		console.log(
			`[audio.upload][${requestId ?? 'n/a'}] session=${sessionId} file=${req.file.originalname} size=${req.file.size} type=${req.file.mimetype}`
		);

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
		console.log(`[audio.upload][${requestId ?? 'n/a'}] Session located`);

		const existingRecording = await AudioRecording.findOne({
			consultationSessionId: session._id,
			hospitalId: req.user.hospitalId,
		}).sort({ createdAt: -1 });

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

		// Forward audio to Python AI Microservice for Transcription + Diarization
		let transcribedText = "";
		let aiSegments = [];
		let responseSegments: Array<Record<string, unknown>> = [];
		let aiAnalysis: Record<string, unknown> | null = null;
		try {
			const AI_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
			console.log(`[audio.upload][${requestId ?? 'n/a'}] Forwarding to AI: ${AI_URL}/api/ai/transcribe`);
			const formData = new FormData();
			const fileBuffer = await fsPromises.readFile(req.file.path);
			
			const blob = new Blob([fileBuffer], { type: req.file.mimetype || 'audio/webm' });
			formData.append('file', blob, req.file.originalname || 'audio.webm');
			
			if (req.user.voiceEmbedding && req.user.voiceEmbedding.length > 0) {
				formData.append('doctor_embedding', JSON.stringify(req.user.voiceEmbedding));
			}

			if (recording) {
				recording.transcriptStatus = TranscriptStatus.PROCESSING;
				recording.processingStartedAt = new Date();
				await recording.save();
			}

			const aiResponse = await fetch(`${AI_URL}/api/ai/transcribe`, {
				method: 'POST',
				body: formData
			});

			if (aiResponse.ok) {
				const data = (await aiResponse.json()) as any;
				transcribedText = data.full_transcript;
				console.log(
					`[audio.upload][${requestId ?? 'n/a'}] AI success segments=${Array.isArray(data.segments) ? data.segments.length : 0}`
				);
				
				if (data?.analysis && typeof data.analysis === 'object') {
					aiAnalysis = data.analysis as Record<string, unknown>;
				}

				if (Array.isArray(data.segments) && data.segments.length > 0) {
					const lastSegment = await TranscriptSegment.findOne({
						consultationSessionId: session._id,
						hospitalId: req.user.hospitalId,
					}).sort({ sequenceNumber: -1 });
					const baseSequence = lastSegment?.sequenceNumber ?? 0;

					const cleanedSegments = data.segments.filter(
						(seg: any) => typeof seg?.text === 'string' && seg.text.trim().length > 0
					);

					aiSegments = cleanedSegments.map((seg: any, index: number) => {
						const roleLabel = seg.speaker || seg.role;
						const normalizedRole = typeof roleLabel === 'string' ? roleLabel.trim().toLowerCase() : '';
						const role =
							normalizedRole === 'doctor'
								? SpeakerRole.DOCTOR
								: normalizedRole === 'patient'
									? SpeakerRole.PATIENT
									: SpeakerRole.UNKNOWN;
						const startMs =
							typeof seg.start === 'number' ? Math.max(0, Math.round(seg.start * 1000)) : undefined;
						const endMs =
							typeof seg.end === 'number' ? Math.max(0, Math.round(seg.end * 1000)) : undefined;
						return {
							hospitalId: req.user!.hospitalId,
							consultationSessionId: session._id,
							audioRecordingId: recording ? recording._id : undefined,
							sequenceNumber: baseSequence + index + 1,
							startMs,
							endMs,
							text: String(seg.text || '').trim(),
							speakerRole: role,
							speakerLabel: roleLabel,
							source: TranscriptSource.AI,
						};
					});
					const createdSegments = await TranscriptSegment.insertMany(aiSegments);
					responseSegments = createdSegments.map((segment) => ({
						_id: segment._id,
						consultationSessionId: segment.consultationSessionId,
						sequenceNumber: segment.sequenceNumber,
						text: segment.text,
						speakerRole: segment.speakerRole,
					}));
				}
				console.log(`[audio.upload][${requestId ?? 'n/a'}] Saved segments=${responseSegments.length}`);

				if (recording) {
					recording.transcriptStatus = TranscriptStatus.COMPLETED;
					await recording.save();
				}
				session.transcriptionStatus = TranscriptionStatus.COMPLETED;
				await session.save();
				
			} else {
				console.error(`[audio.upload][${requestId ?? 'n/a'}] AI Transcription failed:`, await aiResponse.text());
                if (recording) {
					recording.transcriptStatus = TranscriptStatus.FAILED;
					await recording.save();
				}
				session.transcriptionStatus = TranscriptionStatus.FAILED;
				await session.save();
			}
		} catch (error) {
			console.error(`[audio.upload][${requestId ?? 'n/a'}] AI Transcription error:`, error);
		}

		res.status(201).json({ 
			recording, 
			transcript: transcribedText, 
			segments: responseSegments,
			analysis: aiAnalysis
		});
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

export const replaceTranscriptSegments = async (req: Request, res: Response) => {
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

		const segments = Array.isArray(req.body?.segments) ? req.body.segments : [];
		if (!segments.length) {
			res.status(400).json({ message: 'segments is required' });
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

		await TranscriptSegment.deleteMany({
			consultationSessionId: session._id,
			hospitalId: req.user.hospitalId,
		});

		const normalized = segments
			.map((segment: any, index: number) => {
				const text = typeof segment?.text === 'string' ? segment.text.trim() : '';
				if (!text) return null;
				const rawRole = typeof segment?.speakerRole === 'string' ? segment.speakerRole : '';
				const role =
					rawRole === SpeakerRole.DOCTOR ||
					rawRole === 'Doctor' ||
					rawRole === 'doctor'
						? SpeakerRole.DOCTOR
						: rawRole === SpeakerRole.PATIENT ||
							  rawRole === 'Patient' ||
							  rawRole === 'patient'
							? SpeakerRole.PATIENT
							: rawRole === SpeakerRole.SYSTEM
								? SpeakerRole.SYSTEM
								: SpeakerRole.UNKNOWN;
				return {
					hospitalId: req.user!.hospitalId,
					consultationSessionId: session._id,
					audioRecordingId: segment.audioRecordingId,
					sequenceNumber: index + 1,
					speakerRole: role,
					speakerLabel: segment.speakerLabel,
					text,
					startMs: segment.startMs,
					endMs: segment.endMs,
					confidence: segment.confidence,
					source: TranscriptSource.MANUAL,
				};
			})
			.filter(Boolean);

		if (!normalized.length) {
			res.status(400).json({ message: 'No valid segments found' });
			return;
		}

		const created = await TranscriptSegment.insertMany(normalized);

		emitToSessionRoom(req.app, sessionId, 'transcript.replaced', {
			sessionId,
			count: created.length,
		});

		res.status(201).json({ count: created.length });
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to replace transcript';
		res.status(500).json({ message });
		return;
	}
};
