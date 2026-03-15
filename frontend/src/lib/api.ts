export const API_BASE_URL =
  ((globalThis as { __MEDISCRIPT_API_BASE_URL__?: string }).__MEDISCRIPT_API_BASE_URL__ || '').trim() ||
  'http://localhost:5000';

let authToken: string | null = null;

export const setApiToken = (token: string | null) => {
  authToken = token;
};

type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
};

const buildHeaders = (headers: Record<string, string> = {}, includeJson = true) => {
  const next: Record<string, string> = { ...headers };
  if (includeJson) {
    next['Content-Type'] = 'application/json';
  }
  if (authToken) {
    next.Authorization = `Bearer ${authToken}`;
  }
  return next;
};

const toQueryString = (query?: Record<string, string | number | undefined>) => {
  if (!query) return '';
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.set(key, String(value));
    }
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;
  const includeJson = !(body instanceof FormData);

    const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: includeJson ? buildHeaders(headers, true) : buildHeaders(headers, false),
    body: body === undefined ? undefined : includeJson ? JSON.stringify(body) : body,
  });

  const payload = (await response.json().catch(() => ({}))) as {
    message?: string;
    [key: string]: unknown;
  };

  if (!response.ok) {
    if (import.meta.env.DEV) {
      console.warn('API error', {
        url: `${API_BASE_URL}${path}`,
        status: response.status,
        message: payload.message,
      });
    }
    throw new Error(payload.message || `Request failed (${response.status})`);
  }

  return payload as T;
}

export type AuthUser = {
  _id: string;
  hospitalId: string;
  fullName: string;
  email: string;
  role: string;
  phone?: string;
  profileImageUrl?: string;
  status?: string;
  emailVerified?: boolean;
  lastLoginAt?: string;
  voiceEmbedding?: number[];
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

export type PaginatedResponse<T> = {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

export type Patient = {
  _id: string;
  patientGlobalId: string;
  fullName: string;
  sex?: string;
  age?: number;
  phone?: string;
};

export type Session = {
  _id: string;
  patientId: string | Patient;
  doctorId?: string;
  status: string;
  chiefComplaint?: string;
  reasonForVisit?: string;
  createdAt: string;
};

export type AudioRecording = {
  _id: string;
  consultationSessionId: string;
  fileUrl: string;
  transcriptStatus: string;
};

export type TranscriptSegment = {
  _id: string;
  consultationSessionId: string;
  sequenceNumber: number;
  text: string;
  speakerRole?: string;
};

export type TranscriptSegmentInput = {
  text: string;
  speakerRole?: string;
  speakerLabel?: string;
  startMs?: number;
  endMs?: number;
  confidence?: number;
  audioRecordingId?: string;
};

export type UploadSessionAudioResponse = {
  recording: AudioRecording | null;
  transcript?: string;
  segments?: TranscriptSegment[];
  analysis?: {
    complaint?: string;
    symptoms?: string;
    history?: string;
    diagnosis?: string;
    rx?: string;
    followup?: string;
  } | null;
};

export type ConsultationNote = {
  _id: string;
  consultationSessionId: string;
  status: string;
  version: number;
  chiefComplaint?: string;
  symptoms?: string[];
  medicalHistory?: string;
  diagnosisSummary?: string;
  plan?: string;
  followUpInstructions?: string;
  doctorNotes?: string;
};

export type Prescription = {
  _id: string;
  consultationSessionId: string;
  status: string;
  version: number;
  diagnosisText?: string;
  advice?: string;
  followUp?: string;
  warnings?: string[];
  items?: Array<{ medicineName: string; frequency?: string; dose?: string }>;
};

export type LabReport = {
  _id: string;
  panelName: string;
  department: string;
  createdAt: string;
};

export type SessionWorkspace = {
  session: Session;
  note: ConsultationNote | null;
  prescription: Prescription | null;
  labReports: LabReport[];
  transcript: TranscriptSegment[];
};

export type PatientOverview = {
  patient: Patient;
  recentSessions: Session[];
  latestPrescription: Prescription | null;
  recentLabReports: LabReport[];
};

export type UploadLabReportPayload = {
  file?: File;
  panelName: string;
  department: string;
  consultationSessionId?: string;
  title?: string;
  sourceType?: string;
  reportNumber?: string;
  orderNumber?: string;
  remarks?: string;
  clinicalInterpretation?: string;
  results?: Array<Record<string, unknown>>;
};

const toFormData = (payload: Record<string, unknown>) => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (value instanceof Blob) {
      formData.append(key, value);
      return;
    }
    if (Array.isArray(value) || typeof value === 'object') {
      formData.append(key, JSON.stringify(value));
      return;
    }
    formData.append(key, String(value));
  });
  return formData;
};

export const api = {
  login: (email: string, password: string) =>
    apiRequest<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  register: (body: {
    email: string;
    fullName: string;
    password: string;
    role?: string;
    phone?: string;
    profileImageUrl?: string;
  }) => apiRequest<AuthUser>('/api/auth/register', { method: 'POST', body }),

  getMe: () => apiRequest<AuthUser>('/api/auth/me'),

  logout: () => apiRequest<{ message: string }>('/api/auth/logout', { method: 'POST' }),

  enrollVoice: (file: File) => {
    const formData = new FormData();
    formData.append('audio', file);
    return apiRequest<{ message: string; user: AuthUser }>('/api/auth/enroll-voice', {
      method: 'POST',
      body: formData,
    });
  },

  deleteVoice: () => apiRequest<{ message: string; user: AuthUser }>('/api/auth/enroll-voice', { method: 'DELETE' }),

  getPatients: (query?: { q?: string; page?: number; limit?: number }) =>
    apiRequest<PaginatedResponse<Patient>>(`/api/patients${toQueryString(query)}`),

  createPatient: (body: Record<string, unknown>) =>
    apiRequest<Patient>('/api/patients', { method: 'POST', body }),

  getPatientById: (id: string) => apiRequest<Patient>(`/api/patients/${id}`),

  updatePatient: (id: string, body: Record<string, unknown>) =>
    apiRequest<Patient>(`/api/patients/${id}`, { method: 'PATCH', body }),

  getPatientOverview: (id: string) => apiRequest<PatientOverview>(`/api/patients/${id}/overview`),

  getSessions: (query?: { q?: string; page?: number; limit?: number; status?: string }) =>
    apiRequest<PaginatedResponse<Session>>(`/api/sessions${toQueryString(query)}`),

  getSessionById: (sessionId: string) => apiRequest<Session>(`/api/sessions/${sessionId}`),

  createSession: (body: {
    patientId: string;
    encounterType?: string;
    chiefComplaint?: string;
    reasonForVisit?: string;
    tags?: string[];
  }) => apiRequest<Session>('/api/sessions', { method: 'POST', body }),

  startSessionRecording: (sessionId: string) =>
    apiRequest<Session>(`/api/sessions/${sessionId}/start-recording`, { method: 'POST' }),

  stopSessionRecording: (sessionId: string) =>
    apiRequest<Session>(`/api/sessions/${sessionId}/stop-recording`, { method: 'POST' }),

  linkLabReportsToSession: (sessionId: string, labReportIds: string[]) =>
    apiRequest<Session>(`/api/sessions/${sessionId}/lab-reports`, {
      method: 'PATCH',
      body: { labReportIds },
    }),

  getSessionWorkspaceData: (sessionId: string) =>
    apiRequest<SessionWorkspace>(`/api/sessions/${sessionId}/workspace`),

  uploadSessionAudio: (sessionId: string, file: File) => {
    const formData = new FormData();
    formData.append('audio', file);
    return apiRequest<UploadSessionAudioResponse>(`/api/audio/${sessionId}/upload`, {
      method: 'POST',
      body: formData,
    });
  },

  getSessionAudio: (sessionId: string) => apiRequest<AudioRecording>(`/api/audio/${sessionId}`),

  appendTranscriptChunk: (
    sessionId: string,
    body: { text: string; speakerRole?: string; speakerLabel?: string; source?: string }
  ) =>
    apiRequest<TranscriptSegment>(`/api/audio/${sessionId}/transcript-chunks`, {
      method: 'POST',
      body,
    }),

  replaceTranscriptSegments: (sessionId: string, segments: TranscriptSegmentInput[]) =>
    apiRequest<{ count: number }>(`/api/audio/${sessionId}/transcript-replace`, {
      method: 'POST',
      body: { segments },
    }),

  updateTranscriptStatus: (
    sessionId: string,
    body: { transcriptStatus: string; errorMessage?: string }
  ) =>
    apiRequest<AudioRecording>(`/api/audio/${sessionId}/transcript-status`, {
      method: 'PATCH',
      body,
    }),

  generateNoteDraft: (body: {
    sessionId: string;
    chiefComplaint?: string;
    medicalHistory?: string;
    examinationFindings?: string;
    doctorNotes?: string;
  }) => apiRequest<ConsultationNote>('/api/notes/draft', { method: 'POST', body }),

  getLatestNoteBySession: (sessionId: string) =>
    apiRequest<ConsultationNote>(`/api/notes/session/${sessionId}`),

  updateNoteById: (noteId: string, body: Record<string, unknown>) =>
    apiRequest<ConsultationNote>(`/api/notes/${noteId}`, { method: 'PATCH', body }),

  updateLatestNoteBySession: (sessionId: string, body: Record<string, unknown>) =>
    apiRequest<ConsultationNote>(`/api/notes/session/${sessionId}`, { method: 'PATCH', body }),

  finalizeNoteById: (noteId: string) =>
    apiRequest<ConsultationNote>(`/api/notes/${noteId}/finalize`, { method: 'POST' }),

  generatePrescriptionDraft: (body: {
    sessionId: string;
    diagnosisText?: string;
    advice?: string;
    followUp?: string;
    warnings?: string[];
    items?: Array<{
      medicineName: string;
      strength?: string;
      dose?: string;
      frequency?: string;
      durationDays?: number;
      beforeAfterFood?: string;
    }>;
  }) => apiRequest<Prescription>('/api/prescriptions/draft', { method: 'POST', body }),

  getLatestPrescriptionBySession: (sessionId: string) =>
    apiRequest<Prescription>(`/api/prescriptions/session/${sessionId}`),

  updatePrescriptionById: (prescriptionId: string, body: Record<string, unknown>) =>
    apiRequest<Prescription>(`/api/prescriptions/${prescriptionId}`, { method: 'PATCH', body }),

  updateLatestPrescriptionBySession: (sessionId: string, body: Record<string, unknown>) =>
    apiRequest<Prescription>(`/api/prescriptions/session/${sessionId}`, { method: 'PATCH', body }),

  finalizePrescriptionById: (prescriptionId: string) =>
    apiRequest<Prescription>(`/api/prescriptions/${prescriptionId}/finalize`, { method: 'PATCH' }),

  finalizePrescriptionBySession: (sessionId: string) =>
    apiRequest<Prescription>(`/api/prescriptions/session/${sessionId}/finalize`, {
      method: 'PATCH',
    }),

  uploadLabReportForPatient: (patientId: string, payload: UploadLabReportPayload) => {
    const formData = toFormData({
      ...payload,
      labReport: payload.file,
    });
    return apiRequest<LabReport>(`/api/lab-reports/patient/${patientId}`, {
      method: 'POST',
      body: formData,
    });
  },

  getLabReportsByPatient: (patientId: string) =>
    apiRequest<LabReport[]>(`/api/lab-reports/patient/${patientId}`),

  getLabReportsBySession: (sessionId: string) =>
    apiRequest<LabReport[]>(`/api/lab-reports/session/${sessionId}`),

  linkLabReportToSession: (reportId: string, consultationSessionId: string) =>
    apiRequest<LabReport>(`/api/lab-reports/${reportId}/link-to-session`, {
      method: 'PATCH',
      body: { consultationSessionId },
    }),
};
