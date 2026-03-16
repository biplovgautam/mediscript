"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { Filter, Search, Mic, Square, Play, Pause, Trash2 } from "lucide-react";
import { api, API_BASE_URL, type AuthUser, type Patient, type Session } from "@/lib/api";

const formatDate = (value: string) => {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleString();
};

export function HistoryView({ onViewDetails }: { onViewDetails?: (sessionId: string) => void } = {}) {
  const [items, setItems] = useState<Session[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<Awaited<ReturnType<typeof api.getSessionWorkspaceData>> | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadSessions = async (searchValue?: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.getSessions({ page: 1, limit: 30, q: searchValue || undefined });
      setItems(response.items);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Unable to fetch sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSessions();
  }, []);

  const loadDetails = async (sessionId: string) => {
    setDetailsLoading(true);
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setAudioPlaying(false);
      const [data, recording] = await Promise.all([
        api.getSessionWorkspaceData(sessionId),
        api.getSessionAudio(sessionId).catch(() => null),
      ]);
      setWorkspace(data);
      if (recording?.fileUrl) {
        setAudioUrl(`${API_BASE_URL}${recording.fileUrl}`);
      } else {
        setAudioUrl(null);
      }
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Unable to load session details");
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#94A3B8" }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void loadSessions(query.trim());
              }
            }}
            placeholder="Search patient name or id and press Enter"
            className="w-full rounded-xl pl-9 pr-4 py-[9px] text-[13.5px] outline-none"
            style={{ background: "#FFFFFF", border: "1.5px solid rgba(59,130,246,0.15)", color: "#0F1F3D" }}
          />
        </div>
        <button
          onClick={() => void loadSessions(query.trim())}
          className="flex items-center gap-2 px-4 py-[9px] rounded-xl text-[13px]"
          style={{ background: "#FFFFFF", border: "1.5px solid rgba(59,130,246,0.15)", color: "#5B7394" }}
        >
          <Filter size={14} /> Search
        </button>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "#FEF2F2", color: "#B91C1C", border: "1px solid #FECACA" }}>
          {error}
        </div>
      )}

      <div className="grid gap-4" style={{ gridTemplateColumns: "1.1fr 0.9fr" }}>
        <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid rgba(59,130,246,0.09)", boxShadow: "0 2px 16px rgba(59,130,246,0.06)" }}>
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(240,245,251,0.8)", borderBottom: "1px solid rgba(59,130,246,0.09)" }}>
              {["Session ID", "Patient", "Status", "Created At", "Actions"].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.05em]" style={{ color: "#5B7394" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-5 py-4 text-[13px]" style={{ color: "#64748B" }} colSpan={4}>Loading sessions...</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="px-5 py-4 text-[13px]" style={{ color: "#94A3B8" }} colSpan={4}>No sessions found.</td>
              </tr>
            ) : (
              items.map((session) => {
                const patient = typeof session.patientId === "object" ? session.patientId : null;
                return (
                  <tr
                    key={session._id}
                    style={{
                      borderBottom: "1px solid rgba(59,130,246,0.06)",
                      background: selectedSessionId === session._id ? "#EFF6FF" : "transparent",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setSelectedSessionId(session._id);
                      void loadDetails(session._id);
                    }}
                  >
                    <td className="px-5 py-[13px] text-[12px]" style={{ color: "#1E293B", fontFamily: "JetBrains Mono, monospace" }}>
                      {session._id}
                    </td>
                    <td className="px-5 py-[13px] text-[13px]" style={{ color: "#0F1F3D" }}>
                      {patient ? `${patient.fullName} (${patient.patientGlobalId})` : String(session.patientId)}
                    </td>
                    <td className="px-5 py-[13px] text-[12px]">
                      <span
                        className="px-3 py-[4px] rounded-full"
                        style={{
                          background: session.status === "GENERATED" || session.status === "COMPLETED" ? "#ECFDF5" : "#FFF7ED",
                          color: session.status === "GENERATED" || session.status === "COMPLETED" ? "#065F46" : "#B45309",
                        }}
                      >
                        {session.status === "GENERATED" ? "COMPLETED" : session.status}
                      </span>
                    </td>
                    <td className="px-5 py-[13px] text-[13px]" style={{ color: "#5B7394" }}>{formatDate(session.createdAt)}</td>
                    <td className="px-5 py-[13px] text-[12px]">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeleteTarget(session);
                        }}
                        className="p-2 rounded-lg"
                        style={{ background: "#FEF2F2", color: "#DC2626" }}
                        title="Delete session"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          </table>
        </div>

        <div className="rounded-2xl p-5" style={{ background: "#FFFFFF", border: "1px solid rgba(59,130,246,0.09)", boxShadow: "0 2px 16px rgba(59,130,246,0.06)" }}>
          <h3 className="text-[14px] font-semibold mb-3" style={{ color: "#0F1F3D" }}>Session Details</h3>
          {detailsLoading ? (
            <div className="text-[13px]" style={{ color: "#64748B" }}>Loading details...</div>
          ) : !workspace ? (
            <div className="text-[13px]" style={{ color: "#94A3B8" }}>Select a session to view details.</div>
          ) : (
            <div className="flex flex-col gap-3 text-[13px]" style={{ color: "#334155" }}>
              <div>
                <div className="text-[11px] uppercase tracking-[0.06em]" style={{ color: "#94A3B8" }}>Patient</div>
                <div>{typeof workspace.session.patientId === "object" ? workspace.session.patientId.fullName : "Unknown"}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.06em]" style={{ color: "#94A3B8" }}>Chief Complaint</div>
                <div>{workspace.session.chiefComplaint || "-"}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.06em]" style={{ color: "#94A3B8" }}>Status</div>
                <div>{workspace.session.status === "GENERATED" ? "COMPLETED" : workspace.session.status}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.06em]" style={{ color: "#94A3B8" }}>Transcript</div>
                <div className="rounded-xl p-3 mt-1 text-[12px] relative" style={{ background: "#F8FAFC", border: "1px solid rgba(59,130,246,0.12)", maxHeight: 180, overflow: "auto", fontFamily: "JetBrains Mono, monospace" }}>
                  <button
                    onClick={() => {
                      const audio = audioRef.current;
                      if (!audio || !audioUrl) return;
                      if (audioPlaying) {
                        audio.pause();
                        setAudioPlaying(false);
                      } else {
                        audio.play().then(() => setAudioPlaying(true)).catch(() => setAudioPlaying(false));
                      }
                    }}
                    className="absolute top-2 right-2 p-2 rounded-full"
                    style={{ background: "#EFF6FF", color: "#1D4ED8", border: "1px solid rgba(59,130,246,0.2)" }}
                    title={audioPlaying ? "Pause audio" : "Play audio"}
                  >
                    {audioPlaying ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  {workspace.transcript.length
                    ? workspace.transcript.map((line) => line.text).join(" ")
                    : "No transcript available."}
                </div>
                {audioUrl && (
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={() => setAudioPlaying(false)}
                    onPause={() => setAudioPlaying(false)}
                  />
                )}
              </div>
              <button
                onClick={() => {
                  if (selectedSessionId) {
                    onViewDetails?.(selectedSessionId);
                  }
                }}
                className="mt-1 px-4 py-2 rounded-xl text-[12px] font-semibold"
                style={{ background: "linear-gradient(135deg, #2563EB, #6366F1)", color: "white" }}
              >
                View More Detail
              </button>
            </div>
          )}
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(15,23,42,0.45)" }}>
          <div className="w-full max-w-md rounded-2xl p-5" style={{ background: "white", border: "1px solid rgba(59,130,246,0.12)", boxShadow: "0 12px 30px rgba(15,23,42,0.2)" }}>
            <h3 className="text-[16px] font-semibold" style={{ color: "#0F1F3D" }}>Delete Session?</h3>
            <p className="text-[13px] mt-2" style={{ color: "#64748B" }}>
              This will permanently remove session <span style={{ color: "#0F1F3D", fontWeight: 600 }}>{deleteTarget._id}</span> from your history.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-[12px] font-semibold"
                style={{ background: "#F8FAFC", color: "#334155", border: "1px solid rgba(59,130,246,0.15)" }}
              >
                Cancel
              </button>
              <button
                disabled={deleteLoading}
                onClick={async () => {
                  if (!deleteTarget) return;
                  setDeleteLoading(true);
                  try {
                    await api.deleteSession(deleteTarget._id);
                    setItems((prev) => prev.filter((item) => item._id !== deleteTarget._id));
                    if (selectedSessionId === deleteTarget._id) {
                      setSelectedSessionId(null);
                      setWorkspace(null);
                      setAudioUrl(null);
                    }
                    setDeleteTarget(null);
                  } catch (apiError) {
                    setError(apiError instanceof Error ? apiError.message : "Unable to delete session");
                  } finally {
                    setDeleteLoading(false);
                  }
                }}
                className="px-4 py-2 rounded-xl text-[12px] font-semibold text-white disabled:opacity-60"
                style={{ background: "#DC2626" }}
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function PatientView() {
  const [items, setItems] = useState<Patient[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof api.getPatientOverview>> | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  const loadPatients = async (searchValue?: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.getPatients({ page: 1, limit: 40, q: searchValue || undefined });
      setItems(response.items);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Unable to fetch patients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPatients();
  }, []);

  useEffect(() => {
    if (!selectedPatientId && items.length > 0) {
      setSelectedPatientId(items[0]._id);
    }
  }, [items, selectedPatientId]);

  useEffect(() => {
    if (!selectedPatientId) {
      setOverview(null);
      return;
    }
    setOverviewLoading(true);
    api
      .getPatientOverview(selectedPatientId)
      .then((data) => setOverview(data))
      .catch((apiError) => {
        setError(apiError instanceof Error ? apiError.message : "Unable to fetch patient overview");
      })
      .finally(() => setOverviewLoading(false));
  }, [selectedPatientId]);

  const selectedPatient = useMemo(() => {
    return items.find((item) => item._id === selectedPatientId) || null;
  }, [items, selectedPatientId]);

  const visitCount = overview?.recentSessions?.length ?? 0;
  const lastVisit = overview?.recentSessions?.[0]?.createdAt
    ? new Date(overview.recentSessions[0].createdAt).toLocaleDateString()
    : "-";
  const lastRx = overview?.latestPrescription?.diagnosisText || "-";
  const recentLabs = overview?.recentLabReports?.length ?? 0;

  return (
    <div className="grid gap-5" style={{ gridTemplateColumns: "1.4fr 0.9fr" }}>
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#94A3B8" }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void loadPatients(query.trim());
            }}
            placeholder="Search patient by name or global id and press Enter"
            className="w-full rounded-xl pl-9 pr-4 py-[9px] text-[13.5px] outline-none"
            style={{ background: "#FFFFFF", border: "1.5px solid rgba(59,130,246,0.15)", color: "#0F1F3D" }}
          />
        </div>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "#FEF2F2", color: "#B91C1C", border: "1px solid #FECACA" }}>
            {error}
          </div>
        )}

        <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid rgba(59,130,246,0.09)" }}>
          <div className="p-4 border-b" style={{ borderColor: "rgba(59,130,246,0.09)" }}>
            <div className="text-[12px] uppercase tracking-[0.1em]" style={{ color: "#94A3B8" }}>Patients</div>
            <div className="text-[14px] font-semibold" style={{ color: "#0F1F3D" }}>Select a patient to view details</div>
          </div>
          <div className="max-h-[520px] overflow-y-auto">
            {loading ? (
              <div className="px-5 py-4 text-[13px]" style={{ color: "#64748B" }}>Loading patients...</div>
            ) : items.length === 0 ? (
              <div className="px-5 py-4 text-[13px]" style={{ color: "#94A3B8" }}>No patients found.</div>
            ) : (
              items.map((patient) => (
                <div
                  key={patient._id}
                  className="px-5 py-4 flex items-center justify-between"
                  style={{
                    borderBottom: "1px solid rgba(59,130,246,0.06)",
                    background: selectedPatientId === patient._id ? "#EFF6FF" : "transparent",
                    cursor: "pointer",
                  }}
                  onClick={() => setSelectedPatientId(patient._id)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-semibold"
                      style={{ background: "#DBEAFE", color: "#1D4ED8" }}
                    >
                      {patient.fullName?.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase()}
                    </div>
                    <div>
                      <div className="text-[14px] font-semibold" style={{ color: "#0F1F3D" }}>{patient.fullName}</div>
                      <div className="text-[12px]" style={{ color: "#64748B" }}>
                        {patient.sex || "-"} · {patient.age ?? "-"} yrs · {patient.patientGlobalId}
                      </div>
                    </div>
                  </div>
                  <div className="text-[12px]" style={{ color: "#1D4ED8", fontWeight: 600 }}>
                    {selectedPatientId === patient._id ? `${visitCount} visits` : "View"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div
          className="rounded-3xl p-5"
          style={{
            background: "linear-gradient(135deg, #0F172A 0%, #111827 45%, #1F2937 100%)",
            border: "1px solid rgba(59,130,246,0.18)",
            boxShadow: "0 18px 40px rgba(15,23,42,0.35)",
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-[18px] font-bold"
                style={{
                  background: "linear-gradient(135deg, #60A5FA, #2563EB)",
                  color: "white",
                  boxShadow: "0 10px 20px rgba(37,99,235,0.35)",
                }}
              >
                {selectedPatient?.fullName?.[0] || "P"}
              </div>
              <div>
                <div className="text-[18px] font-semibold" style={{ color: "white" }}>
                  {selectedPatient?.fullName || "Select a patient"}
                </div>
                <div className="text-[12px]" style={{ color: "rgba(148,163,184,0.9)" }}>
                  {selectedPatient?.sex || "-"} · {selectedPatient?.age ?? "-"} yrs · {visitCount} visits
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 rounded-full text-[11px] font-semibold" style={{ background: "rgba(34,197,94,0.2)", color: "#86EFAC" }}>
                Active
              </div>
              <div className="px-3 py-1 rounded-full text-[11px]" style={{ background: "rgba(59,130,246,0.15)", color: "#BFDBFE" }}>
                {selectedPatient?.patientGlobalId || "No ID"}
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-3" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            {[
              { label: "Last Visit", value: overviewLoading ? "Loading..." : lastVisit },
              { label: "Recent Labs", value: overviewLoading ? "..." : String(recentLabs) },
              { label: "Last Diagnosis", value: overviewLoading ? "..." : lastRx },
              { label: "Phone", value: selectedPatient?.phone || "-" },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl p-3" style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.2)" }}>
                <div className="text-[10px] uppercase tracking-[0.1em]" style={{ color: "rgba(148,163,184,0.8)" }}>{card.label}</div>
                <div className="text-[13px] mt-2" style={{ color: "white" }}>{card.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-4" style={{ background: "#FFFFFF", border: "1px solid rgba(59,130,246,0.09)" }}>
          <div className="text-[12px] uppercase tracking-[0.08em]" style={{ color: "#94A3B8" }}>Recent Visits</div>
          <div className="mt-3 flex flex-col gap-2">
            {(overview?.recentSessions || []).slice(0, 5).map((session) => (
              <div key={session._id} className="rounded-xl px-3 py-2" style={{ background: "#F8FAFC", border: "1px solid rgba(59,130,246,0.1)" }}>
                <div className="text-[12px]" style={{ color: "#0F1F3D" }}>
                  {new Date(session.createdAt).toLocaleDateString()} · {session.status}
                </div>
                <div className="text-[11px] mt-1" style={{ color: "#64748B" }}>
                  {session.chiefComplaint || "No chief complaint"}
                </div>
              </div>
            ))}
            {!overview?.recentSessions?.length && (
              <div className="text-[12px]" style={{ color: "#94A3B8" }}>No visits recorded yet.</div>
            )}
          </div>
        </div>

        <div className="rounded-2xl p-4" style={{ background: "#FFFFFF", border: "1px solid rgba(59,130,246,0.09)" }}>
          <div className="text-[12px] uppercase tracking-[0.08em]" style={{ color: "#94A3B8" }}>Quick Analytics</div>
          <div className="mt-3 grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
            {[
              { label: "Total Visits", value: overviewLoading ? "..." : String(visitCount) },
              { label: "Recent Labs", value: overviewLoading ? "..." : String(recentLabs) },
              { label: "Active Rx", value: overview?.latestPrescription ? "Yes" : "No" },
              { label: "Status", value: overview?.recentSessions?.[0]?.status || "-" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl px-3 py-2" style={{ background: "#F8FAFC", border: "1px solid rgba(59,130,246,0.1)" }}>
                <div className="text-[10px] uppercase tracking-[0.08em]" style={{ color: "#94A3B8" }}>{item.label}</div>
                <div className="text-[13px] mt-1" style={{ color: "#0F1F3D" }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SettingsView({ user }: { user: AuthUser }) {
  const [activeTab, setActiveTab] = useState("Doctor Profile");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [enrollMsg, setEnrollMsg] = useState("");
  const [hasVoiceEnrolled, setHasVoiceEnrolled] = useState(!!user.voiceEmbedding && user.voiceEmbedding.length > 0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const startVoiceEnrollment = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        setEnrollMsg("Processing voice enrollment...");
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], "enrollment.webm", { type: "audio/webm" });
        console.log('Sending file of size:', file.size, 'type:', file.type);
        try {
          await api.enrollVoice(file);
          setEnrollMsg("Voice enrolled successfully!");
          setHasVoiceEnrolled(true);
        } catch (err) {
          setEnrollMsg(err instanceof Error ? err.message : "Failed to enroll voice");
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setEnrollMsg("Recording... Please speak clearly for 10-15 seconds.");
    } catch (err) {
      setEnrollMsg("Microphone access denied or error occurred.");
    }
  };

  const stopVoiceEnrollment = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
    }
  };

  const removeVoice = async () => {
    try {
      setEnrollMsg("Deleting voice embedding...");
      await api.deleteVoice();
      setHasVoiceEnrolled(false);
      setEnrollMsg("Voice embedding deleted successfully.");
      setTimeout(() => setEnrollMsg(""), 3000);
    } catch (err) {
      setEnrollMsg(err instanceof Error ? err.message : "Failed to delete voice");
    }
  };

  const toggles = [
    { label: "Auto-generate summary", desc: "Generate notes automatically when recording stops", on: true },
    { label: "Live transcription", desc: "Show real-time text during consultation", on: true },
    { label: "Diagnosis suggestions", desc: "Show AI-suggested differential diagnoses", on: true },
    { label: "Prescription suggestions", desc: "Allow AI to suggest medications", on: false },
  ];

  return (
    <div className="grid gap-5" style={{ gridTemplateColumns: "200px 1fr" }}>
      <div className="flex flex-col gap-1">
        {["Doctor Profile", "AI Settings", "Export Settings", "Privacy & Security"].map((item) => (
          <button
            key={item}
            onClick={() => setActiveTab(item)}
            className="w-full text-left px-3 py-[9px] rounded-xl text-[13.5px] transition-all"
            style={{
              background: activeTab === item ? "#EFF6FF" : "transparent",
              color: activeTab === item ? "#2563EB" : "#5B7394",
              fontWeight: activeTab === item ? 500 : 400,
            }}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {activeTab === "Doctor Profile" && (
          <div className="rounded-2xl p-6" style={{ background: "#FFFFFF", border: "1px solid rgba(59,130,246,0.09)", boxShadow: "0 2px 12px rgba(59,130,246,0.05)" }}>
            <h3 className="text-[15px] font-bold mb-1" style={{ color: "#0F1F3D" }}>Doctor Profile</h3>
            <p className="text-[13px] mb-5" style={{ color: "#94A3B8" }}>Your information appears on all generated notes and PDF exports.</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              {[
                { l: "Full Name", v: user.fullName || "-" },
                { l: "Role", v: user.role || "-" },
              ].map(({ l, v }) => (
                <div key={l}>
                  <label className="block text-[12px] font-medium mb-1" style={{ color: "#5B7394" }}>{l}</label>
                  <input type="text" value={v} readOnly className="w-full rounded-xl px-3 py-[9px] text-[13.5px] outline-none"
                    style={{ background: "#F8FAFC", border: "1.5px solid rgba(59,130,246,0.15)", color: "#0F1F3D" }} />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              {[
                { l: "Email", v: user.email || "-" },
                { l: "Phone", v: user.phone || "-" },
              ].map(({ l, v }) => (
                <div key={l}>
                  <label className="block text-[12px] font-medium mb-1" style={{ color: "#5B7394" }}>{l}</label>
                  <input type="text" value={v} readOnly className="w-full rounded-xl px-3 py-[9px] text-[13.5px] outline-none"
                    style={{ background: "#F8FAFC", border: "1.5px solid rgba(59,130,246,0.15)", color: "#0F1F3D" }} />
                </div>
              ))}
            </div>
            <div className="mb-4">
              <label className="block text-[12px] font-medium mb-1" style={{ color: "#5B7394" }}>Hospital ID</label>
              <input type="text" value={user.hospitalId || "-"} readOnly className="w-full rounded-xl px-3 py-[9px] text-[13.5px] outline-none"
                style={{ background: "#F8FAFC", border: "1.5px solid rgba(59,130,246,0.15)", color: "#0F1F3D" }} />
            </div>
            <button className="px-4 py-[9px] rounded-xl text-[13px] font-semibold"
              style={{ background: "linear-gradient(135deg, #2563EB, #6366F1)", color: "white", boxShadow: "0 2px 10px rgba(37,99,235,0.3)" }}>
              Synced From Backend
            </button>
          </div>
        )}

        {activeTab === "AI Settings" && (
          <>
            <div className="rounded-2xl p-6" style={{ background: "#FFFFFF", border: "1px solid rgba(59,130,246,0.09)", boxShadow: "0 2px 12px rgba(59,130,246,0.05)" }}>
              <h3 className="text-[15px] font-bold mb-1" style={{ color: "#0F1F3D" }}>AI Voice Enrollment</h3>
              <p className="text-[13px] mb-5" style={{ color: "#94A3B8" }}>
                Add your voice print. This allows Mediscript AI to securely identify your voice from the patient's voice during consultations. 
                Please click record and speak naturally for 10-15 seconds.
              </p>
              
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl mb-2 transition-all" style={{ borderColor: isRecording ? "#ef4444" : "rgba(59,130,246,0.2)", background: isRecording ? "#FEF2F2" : "#F8FAFC" }}>
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-4 py-4">
                    <div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
                    <span className="text-[14px] font-semibold text-blue-600">Extracting Voice Features...</span>
                  </div>
                ) : hasVoiceEnrolled ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: "#10B981", boxShadow: "0 0 6px rgba(16,185,129,0.6)" }} />
                      <span className="text-[14px] font-semibold text-emerald-600">Voice Profile Active</span>
                    </div>
                    <p className="text-[13px] text-center max-w-sm" style={{ color: "#5B7394" }}>
                      Your voice has been securely enrolled. We use these embeddings to identify you correctly in consultations.
                    </p>
                    <button 
                      onClick={removeVoice}
                      className="px-5 py-2.5 rounded-full text-white font-medium transition-all hover:scale-105"
                      style={{ background: "#EF4444", boxShadow: "0 4px 14px rgba(239,68,68,0.35)", fontSize: "13px" }}
                    >
                      Delete Voice Profile
                    </button>
                  </div>
                ) : !isRecording ? (
                  <button 
                    onClick={startVoiceEnrollment}
                    className="flex items-center gap-2 px-5 py-3 rounded-full text-white font-medium transition-all hover:scale-105"
                    style={{ background: "#2563EB", boxShadow: "0 4px 14px rgba(37,99,235,0.35)" }}
                  >
                    <Mic size={18} />
                    Start Recording Voice
                  </button>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2">
                       <span className="w-3 h-3 rounded-full" style={{ background: "#EF4444", animation: "pulse 1.2s ease infinite", boxShadow: "0 0 6px rgba(239,68,68,0.6)" }} />
                       <span className="text-[14px] font-semibold text-red-600">Recording Active</span>
                    </div>
                    <button 
                      onClick={stopVoiceEnrollment}
                      className="flex items-center gap-2 px-5 py-3 rounded-full text-white font-medium transition-all hover:scale-105"
                      style={{ background: "#EF4444", boxShadow: "0 4px 14px rgba(239,68,68,0.35)" }}
                    >
                      <Square size={18} fill="currentColor" />
                      Stop & Save Voice
                    </button>
                  </div>
                )}
                
                {enrollMsg && (
                  <p className="mt-4 text-[13px] font-medium text-center" style={{ color: enrollMsg.includes("success") ? "#059669" : (enrollMsg.includes("failed") || enrollMsg.includes("denied") ? "#DC2626" : "#2563EB") }}>
                    {enrollMsg}
                  </p>
                )}
              </div>
              <p className="text-[11px] text-center" style={{ color: "#94A3B8" }}>Your voice data is temporarily processed and safely converted into abstract mathematical embeddings.</p>
            </div>

            <div className="rounded-2xl p-6" style={{ background: "#FFFFFF", border: "1px solid rgba(59,130,246,0.09)", boxShadow: "0 2px 12px rgba(59,130,246,0.05)" }}>
              <h3 className="text-[15px] font-bold mb-1" style={{ color: "#0F1F3D" }}>AI Preferences</h3>
              <p className="text-[13px] mb-5" style={{ color: "#94A3B8" }}>Control how AI processes and generates your consultation notes.</p>
            {toggles.map((t) => (
              <div key={t.label} className="flex items-center justify-between py-4" style={{ borderBottom: "1px solid rgba(59,130,246,0.07)" }}>
                <div>
                  <p className="text-[13.5px] font-medium" style={{ color: "#0F1F3D" }}>{t.label}</p>
                  <p className="text-[12px]" style={{ color: "#94A3B8" }}>{t.desc}</p>
                </div>
                <div
                  className="relative w-10 h-[22px] rounded-full cursor-pointer transition-all"
                  style={{ background: t.on ? "#2563EB" : "#E2E8F0" }}
                >
                  <div
                    className="absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all"
                    style={{ left: t.on ? "22px" : "3px", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}
                  />
                </div>
              </div>
            ))}
            </div>
          </>
        )}

        {activeTab === "Export Settings" && (
          <div className="rounded-2xl p-6" style={{ background: "#FFFFFF", border: "1px solid rgba(59,130,246,0.09)", boxShadow: "0 2px 12px rgba(59,130,246,0.05)" }}>
            <h3 className="text-[15px] font-bold mb-1" style={{ color: "#0F1F3D" }}>Export Settings</h3>
            <p className="text-[13px] mb-5" style={{ color: "#94A3B8" }}>Configure how your prescriptions and notes are formatted when exported to PDF.</p>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-[13px] text-slate-500">
              PDF template configurations will be available here.
            </div>
          </div>
        )}

        {activeTab === "Privacy & Security" && (
          <div className="rounded-2xl p-6" style={{ background: "#FFFFFF", border: "1px solid rgba(59,130,246,0.09)", boxShadow: "0 2px 12px rgba(59,130,246,0.05)" }}>
            <h3 className="text-[15px] font-bold mb-1" style={{ color: "#0F1F3D" }}>Privacy & Security</h3>
            <p className="text-[13px] mb-5" style={{ color: "#94A3B8" }}>Manage your account security and data permissions.</p>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-[13px] text-slate-500">
              Password change and session management will be available here.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
