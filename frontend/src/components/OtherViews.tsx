"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { Filter, Search, Mic, Square } from "lucide-react";
import { api, type AuthUser, type Patient, type Session } from "@/lib/api";

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
      const data = await api.getSessionWorkspaceData(sessionId);
      setWorkspace(data);
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
              {["Session ID", "Patient", "Status", "Created At"].map((h) => (
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
                      <span className="px-3 py-[4px] rounded-full" style={{ background: "#EFF6FF", color: "#1D4ED8" }}>{session.status}</span>
                    </td>
                    <td className="px-5 py-[13px] text-[13px]" style={{ color: "#5B7394" }}>{formatDate(session.createdAt)}</td>
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
                <div>{workspace.session.status}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.06em]" style={{ color: "#94A3B8" }}>Transcript</div>
                <div className="rounded-xl p-3 mt-1 text-[12px]" style={{ background: "#F8FAFC", border: "1px solid rgba(59,130,246,0.12)", maxHeight: 160, overflow: "auto", fontFamily: "JetBrains Mono, monospace" }}>
                  {workspace.transcript.length
                    ? workspace.transcript.map((line) => line.text).join(" ")
                    : "No transcript available."}
                </div>
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
    </div>
  );
}

export function PatientView() {
  const [items, setItems] = useState<Patient[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const selectedPatient = useMemo(() => items[0] || null, [items]);

  return (
    <div className="grid gap-5" style={{ gridTemplateColumns: "290px 1fr" }}>
      <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid rgba(59,130,246,0.09)", boxShadow: "0 2px 16px rgba(59,130,246,0.06)" }}>
        <div className="p-6 text-center" style={{ background: "linear-gradient(135deg, #1D4ED8, #4F46E5)" }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-3" style={{ background: "rgba(255,255,255,0.2)", border: "3px solid rgba(255,255,255,0.35)" }}>
            {selectedPatient?.fullName?.[0] || "P"}
          </div>
          <p className="text-white font-bold text-[17px]">{selectedPatient?.fullName || "No patient selected"}</p>
          <p className="text-[12px] mt-1" style={{ color: "rgba(255,255,255,0.65)" }}>{selectedPatient?.patientGlobalId || "-"}</p>
        </div>
        <div className="p-5">
          <div className="flex justify-between py-[8px]" style={{ borderBottom: "1px solid rgba(59,130,246,0.07)" }}>
            <span className="text-[12px]" style={{ color: "#94A3B8" }}>Age</span>
            <span className="text-[13px] font-medium" style={{ color: "#0F1F3D" }}>{selectedPatient?.age ?? "-"}</span>
          </div>
          <div className="flex justify-between py-[8px]" style={{ borderBottom: "1px solid rgba(59,130,246,0.07)" }}>
            <span className="text-[12px]" style={{ color: "#94A3B8" }}>Sex</span>
            <span className="text-[13px] font-medium" style={{ color: "#0F1F3D" }}>{selectedPatient?.sex ?? "-"}</span>
          </div>
          <div className="flex justify-between py-[8px]" style={{ borderBottom: "1px solid rgba(59,130,246,0.07)" }}>
            <span className="text-[12px]" style={{ color: "#94A3B8" }}>Phone</span>
            <span className="text-[13px] font-medium" style={{ color: "#0F1F3D" }}>{selectedPatient?.phone ?? "-"}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
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
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(240,245,251,0.8)", borderBottom: "1px solid rgba(59,130,246,0.09)" }}>
                {["Global ID", "Name", "Sex", "Age", "Phone"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.05em]" style={{ color: "#5B7394" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-4 text-[13px]" style={{ color: "#64748B" }}>Loading patients...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-4 text-[13px]" style={{ color: "#94A3B8" }}>No patients found.</td></tr>
              ) : (
                items.map((patient) => (
                  <tr key={patient._id} style={{ borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
                    <td className="px-5 py-[13px] text-[12px]" style={{ color: "#1E293B", fontFamily: "JetBrains Mono, monospace" }}>{patient.patientGlobalId}</td>
                    <td className="px-5 py-[13px] text-[13px]" style={{ color: "#0F1F3D" }}>{patient.fullName}</td>
                    <td className="px-5 py-[13px] text-[13px]" style={{ color: "#5B7394" }}>{patient.sex || "-"}</td>
                    <td className="px-5 py-[13px] text-[13px]" style={{ color: "#5B7394" }}>{patient.age ?? "-"}</td>
                    <td className="px-5 py-[13px] text-[13px]" style={{ color: "#5B7394" }}>{patient.phone || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
