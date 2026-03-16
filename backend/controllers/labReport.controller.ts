import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import LabReport, { Flag, type ILabResultRow } from '../models/labReport.model.js';
import UploadedDocument, { DocumentType, OcrStatus } from '../models/uploadedDocument.model.js';
import ConsultationSession from '../models/consultationSession.model.js';
import { emitToSessionRoom } from '../utils/socket.util.js';

const parseMultipartJson = <T>(value: unknown): T | undefined => {
	if (value === undefined || value === null || value === '') return undefined;
	if (typeof value !== 'string') return value as T;

	try {
		return JSON.parse(value) as T;
	} catch {
		return undefined;
	}
};

const normalizeRows = (rows: unknown): ILabResultRow[] => {
	if (!Array.isArray(rows)) return [];

	const normalized: ILabResultRow[] = [];

	rows.forEach((row, index) => {
		const data = row as Partial<ILabResultRow>;
		if (!data.testName || !data.resultValue) return;

		const resultRow = {
			testName: String(data.testName),
			resultValue: String(data.resultValue),
			flag: data.flag && Object.values(Flag).includes(data.flag) ? data.flag : Flag.UNKNOWN,
			displayOrder: data.displayOrder ?? index,
		} as ILabResultRow;

		if (data.method !== undefined) resultRow.method = data.method;
		if (data.numericValue !== undefined) resultRow.numericValue = data.numericValue;
		if (data.unit !== undefined) resultRow.unit = data.unit;
		if (data.refRangeText !== undefined) resultRow.refRangeText = data.refRangeText;
		if (data.refMin !== undefined) resultRow.refMin = data.refMin;
		if (data.refMax !== undefined) resultRow.refMax = data.refMax;
		if (data.remarks !== undefined) resultRow.remarks = data.remarks;

		normalized.push(resultRow);
	});

	return normalized;
};

const calculateAbnormalCount = (rows: ILabResultRow[]): number =>
	rows.filter((row) => [Flag.HIGH, Flag.LOW, Flag.CRITICAL].includes(row.flag)).length;

const requireStringParam = (value: unknown): string | null => {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed || null;
};

export const uploadLabReport = async (req: Request, res: Response) => {
	let createdUploadedDocumentId: mongoose.Types.ObjectId | undefined;
	try {
		if (!req.user) {
			res.status(401).json({ message: 'Not authorized' });
			return;
		}

		const patientId = requireStringParam(req.params.patientId);
		if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
			res.status(400).json({ message: 'Invalid patient id' });
			return;
		}

		const {
			consultationSessionId,
			title,
			panelName,
			panalName,
			department,
			sourceType,
			reportNumber,
			orderNumber,
			crNumber,
			opdIpdNumber,
			referredDoctorName,
			corporateName,
			approvalLevel,
			barcodeValue,
			qrCodeValue,
			remarks,
			clinicalInterpretation,
			results,
			orderedAt,
			collectedAt,
			receivedAt,
			approvedAt,
		} = req.body;

		const resolvedPanelName = requireStringParam(panelName) ?? requireStringParam(panalName);
		const parsedResults = parseMultipartJson<unknown[]>(results) ?? results;

		const sessionId = typeof consultationSessionId === 'string' ? consultationSessionId : undefined;

		if (!resolvedPanelName || !department) {
			res.status(400).json({ message: 'panelName and department are required' });
			return;
		}

		if (results !== undefined && !Array.isArray(parsedResults)) {
			res.status(400).json({ message: 'results must be a valid JSON array' });
			return;
		}

		let uploadedDocumentId: mongoose.Types.ObjectId | undefined;
		let fileUrl: string | undefined;

		if (req.file) {
			fileUrl = `/${req.file.path.replace(/\\/g, '/')}`;
			const uploadedDocumentPayload: Record<string, unknown> = {
				hospitalId: req.user.hospitalId,
				patientId,
				uploadedBy: req.user._id,
				documentType: DocumentType.LAB_REPORT,
				title: title || req.file.originalname,
				originalFileName: req.file.originalname,
				mimeType: req.file.mimetype,
				fileUrl,
				fileSizeBytes: req.file.size,
				ocrStatus: OcrStatus.PENDING,
			};

			if (sessionId) {
				uploadedDocumentPayload.consultationSessionId = sessionId;
			}

			const doc = await UploadedDocument.create(uploadedDocumentPayload);
			uploadedDocumentId = doc._id;
			createdUploadedDocumentId = doc._id;
		}

		const normalizedRows = normalizeRows(parsedResults);

		const labReportPayload: Record<string, unknown> = {
			hospitalId: req.user.hospitalId,
			patientId,
			reportNumber,
			orderNumber,
			crNumber,
			opdIpdNumber,
			panelName: resolvedPanelName,
			department,
			referredDoctorName,
			corporateName,
			orderedAt,
			collectedAt,
			receivedAt,
			approvedAt,
			approvalLevel,
			barcodeValue,
			qrCodeValue,
			remarks,
			clinicalInterpretation,
			pdfUrl: fileUrl,
			sourceType,
			results: normalizedRows,
			abnormalCount: calculateAbnormalCount(normalizedRows),
		};

		if (sessionId) {
			labReportPayload.consultationSessionId = sessionId;
		}
		if (uploadedDocumentId) {
			labReportPayload.uploadedDocumentId = uploadedDocumentId;
		}

		const report = await LabReport.create(labReportPayload);

		if (sessionId && mongoose.Types.ObjectId.isValid(sessionId)) {
			await ConsultationSession.findOneAndUpdate(
				{
					_id: sessionId,
					hospitalId: req.user.hospitalId,
					isDeleted: false,
				},
				{
					$addToSet: {
						linkedLabReportIds: report._id,
					},
				}
			);
			emitToSessionRoom(req.app, sessionId, 'session.lab-report.added', {
				sessionId,
				reportId: String(report._id),
			});
		}

		res.status(201).json(report);
		return;
	} catch (error) {
		if (createdUploadedDocumentId) {
			await UploadedDocument.deleteOne({ _id: createdUploadedDocumentId }).catch(() => undefined);
		}
		const message = error instanceof Error ? error.message : 'Unable to upload lab report';
		res.status(500).json({ message });
		return;
	}
};

export const getPatientLabReports = async (req: Request, res: Response) => {
	try {
		if (!req.user) {
			res.status(401).json({ message: 'Not authorized' });
			return;
		}

		const patientId = requireStringParam(req.params.patientId);
		if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
			res.status(400).json({ message: 'Invalid patient id' });
			return;
		}

		const reports = await LabReport.find({
			patientId,
			hospitalId: req.user.hospitalId,
			isDeleted: false,
		}).sort({ collectedAt: -1, createdAt: -1 });

		res.json(reports);
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to fetch lab reports';
		res.status(500).json({ message });
		return;
	}
};

export const getSessionLabReports = async (req: Request, res: Response) => {
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

		const reports = await LabReport.find({
			consultationSessionId: sessionId,
			hospitalId: req.user.hospitalId,
			isDeleted: false,
		}).sort({ collectedAt: -1, createdAt: -1 });

		res.json(reports);
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to fetch session lab reports';
		res.status(500).json({ message });
		return;
	}
};

export const linkReportToSession = async (req: Request, res: Response) => {
	try {
		if (!req.user) {
			res.status(401).json({ message: 'Not authorized' });
			return;
		}

		const id = requireStringParam(req.params.id);
		const consultationSessionId =
			typeof req.body.consultationSessionId === 'string'
				? req.body.consultationSessionId
				: null;

		if (
			!id ||
			!consultationSessionId ||
			!mongoose.Types.ObjectId.isValid(id) ||
			!mongoose.Types.ObjectId.isValid(consultationSessionId)
		) {
			res.status(400).json({ message: 'Invalid ids' });
			return;
		}

		const report = await LabReport.findOneAndUpdate(
			{
				_id: id,
				hospitalId: req.user.hospitalId,
				isDeleted: false,
			},
			{
				consultationSessionId,
			},
			{ new: true }
		);

		if (!report) {
			res.status(404).json({ message: 'Lab report not found' });
			return;
		}

		await ConsultationSession.findOneAndUpdate(
			{
				_id: consultationSessionId,
				hospitalId: req.user.hospitalId,
				isDeleted: false,
			},
			{
				$addToSet: {
					linkedLabReportIds: report._id,
				},
			}
		);

		emitToSessionRoom(req.app, consultationSessionId, 'session.lab-report.linked', {
			sessionId: consultationSessionId,
			reportId: String(report._id),
		});

		res.json(report);
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to link lab report to session';
		res.status(500).json({ message });
		return;
	}
};
