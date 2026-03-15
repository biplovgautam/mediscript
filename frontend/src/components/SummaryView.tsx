"use client";
import { useEffect, useMemo, useState } from "react";
import { api, type SessionWorkspace } from "@/lib/api";
import { Download, RefreshCw, Save, CheckCircle2, CircleAlert } from "lucide-react";

export function SummaryView({ sessionId, onNew }: { sessionId: string | null; onNew: () => void }) {
  const [workspace, setWorkspace] = useState<SessionWorkspace | null>(null);
  const [sessionLabReports, setSessionLabReports] = useState<Array<{ _id: string; panelName: string; department: string; createdAt: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadWorkspace = async () => {
    if (!sessionId) return;
    setLoading(true);
    setError("");
    try {
      const [data, labReports] = await Promise.all([
        api.getSessionWorkspaceData(sessionId),
        api.getLabReportsBySession(sessionId),
      ]);
      setWorkspace(data);
      setSessionLabReports(labReports);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Unable to load session summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, [sessionId]);

  const transcriptText = useMemo(() => {
    if (!workspace?.transcript?.length) return "";
    return workspace.transcript
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
      .map((item) => item.text)
      .join("\n");
  }, [workspace]);

  const handleFinalizeNote = async () => {
    if (!workspace?.note?._id) return;
    setSaving(true);
    setError("");
    try {
      await api.finalizeNoteById(workspace.note._id);
      await loadWorkspace();
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Unable to finalize note");
    } finally {
      setSaving(false);
    }
  };

  const handleFinalizePrescription = async () => {
    if (!sessionId) return;
    setSaving(true);
    setError("");
    try {
      await api.finalizePrescriptionBySession(sessionId);
      await loadWorkspace();
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Unable to finalize prescription");
    } finally {
      setSaving(false);
    }
  };

  if (!sessionId) {
    return (
      <div
        className="rounded-2xl p-6"
        style={{ background: "white", border: "1px solid rgba(59,130,246,0.09)", boxShadow: "0 2px 12px rgba(59,130,246,0.06)" }}
      >
        <h2 className="text-lg font-bold" style={{ color: "#0F1F3D" }}>No Consultation Selected</h2>
        <p className="text-sm mt-1" style={{ color: "#64748B" }}>
          Start a consultation to generate and review note and prescription summary.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="rounded-2xl p-5 flex items-center justify-between"
        style={{ background: "white", border: "1px solid rgba(59,130,246,0.09)", boxShadow: "0 2px 12px rgba(59,130,246,0.06)" }}
      >
        <div>
          <h2 className="text-[18px] font-bold" style={{ color: "#0F1F3D" }}>Session Summary</h2>
          <p className="text-[12px]" style={{ color: "#64748B" }}>Session ID: {sessionId}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void loadWorkspace()}
            className="flex items-center gap-2 px-3 py-[8px] rounded-xl text-[12px] font-medium"
            style={{ background: "#F8FAFC", color: "#334155", border: "1px solid rgba(59,130,246,0.15)" }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={onNew}
            className="flex items-center gap-2 px-3 py-[8px] rounded-xl text-[12px] font-medium"
            style={{ background: "linear-gradient(135deg, #2563EB, #6366F1)", color: "white" }}
          >
            <Save size={14} /> New Consultation
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "#FEF2F2", color: "#B91C1C", border: "1px solid #FECACA" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl p-6 text-sm" style={{ background: "white", color: "#64748B", border: "1px solid rgba(59,130,246,0.09)" }}>
          Loading workspace data...
        </div>
      ) : (
        <>
          <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="rounded-2xl p-5" style={{ background: "white", border: "1px solid rgba(59,130,246,0.09)" }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[15px] font-semibold" style={{ color: "#0F1F3D" }}>Consultation Note</h3>
                <span className="text-[11px]" style={{ color: "#64748B" }}>
                  {workspace?.note?.status || "Not generated"}
                </span>
              </div>
              {workspace?.note ? (
                <div className="text-[13px]" style={{ color: "#334155", lineHeight: 1.6 }}>
                  <p><strong>Chief Complaint:</strong> {workspace.note.chiefComplaint || "-"}</p>
                  <p><strong>Symptoms:</strong> {(workspace.note.symptoms || []).join(", ") || "-"}</p>
                  <p><strong>Medical History:</strong> {workspace.note.medicalHistory || "-"}</p>
                  <p><strong>Diagnosis:</strong> {workspace.note.diagnosisSummary || "-"}</p>
                </div>
              ) : (
                <p className="text-[13px]" style={{ color: "#94A3B8" }}>No note available yet.</p>
              )}
              <div className="mt-4 flex gap-2">
                <button
                  disabled={!workspace?.note?._id || saving}
                  onClick={() => void handleFinalizeNote()}
                  className="flex items-center gap-2 px-3 py-[8px] rounded-xl text-[12px] font-medium disabled:opacity-50"
                  style={{ background: "#ECFDF5", color: "#065F46", border: "1px solid rgba(16,185,129,0.25)" }}
                >
                  <CheckCircle2 size={14} /> Finalize Note
                </button>
              </div>
            </div>

            <div className="rounded-2xl p-5" style={{ background: "white", border: "1px solid rgba(59,130,246,0.09)" }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[15px] font-semibold" style={{ color: "#0F1F3D" }}>Prescription</h3>
                <span className="text-[11px]" style={{ color: "#64748B" }}>
                  {workspace?.prescription?.status || "Not generated"}
                </span>
              </div>
              {workspace?.prescription ? (
                <div className="text-[13px]" style={{ color: "#334155", lineHeight: 1.6 }}>
                  <p><strong>Diagnosis:</strong> {workspace.prescription.diagnosisText || "-"}</p>
                  <p><strong>Advice:</strong> {workspace.prescription.advice || "-"}</p>
                  <p><strong>Follow Up:</strong> {workspace.prescription.followUp || "-"}</p>
                  <p><strong>Items:</strong> {(workspace.prescription.items || []).length}</p>
                </div>
              ) : (
                <p className="text-[13px]" style={{ color: "#94A3B8" }}>No prescription available yet.</p>
              )}
              <div className="mt-4 flex gap-2">
                <button
                  disabled={!workspace?.prescription?._id || saving}
                  onClick={() => void handleFinalizePrescription()}
                  className="flex items-center gap-2 px-3 py-[8px] rounded-xl text-[12px] font-medium disabled:opacity-50"
                  style={{ background: "#ECFDF5", color: "#065F46", border: "1px solid rgba(16,185,129,0.25)" }}
                >
                  <CheckCircle2 size={14} /> Finalize Prescription
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="rounded-2xl p-5" style={{ background: "white", border: "1px solid rgba(59,130,246,0.09)" }}>
              <h3 className="text-[15px] font-semibold mb-3" style={{ color: "#0F1F3D" }}>Lab Reports</h3>
              {!sessionLabReports.length ? (
                <p className="text-[13px]" style={{ color: "#94A3B8" }}>No linked lab reports.</p>
              ) : (
                <ul className="text-[13px]" style={{ color: "#334155" }}>
                  {sessionLabReports.map((report) => (
                    <li key={report._id} className="py-1">
                      {report.panelName} ({report.department})
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl p-5" style={{ background: "white", border: "1px solid rgba(59,130,246,0.09)" }}>
              <h3 className="text-[15px] font-semibold mb-3" style={{ color: "#0F1F3D" }}>Transcript</h3>
              <textarea
                readOnly
                value={transcriptText || "No transcript available yet."}
                className="w-full rounded-xl p-3 text-[12px] outline-none resize-none"
                rows={8}
                style={{ background: "#F8FAFC", border: "1px solid rgba(59,130,246,0.12)", color: "#334155", fontFamily: "JetBrains Mono, monospace" }}
              />
              <div className="mt-3 flex gap-2">
                <button
                  className="flex items-center gap-2 px-3 py-[8px] rounded-xl text-[12px] font-medium"
                  style={{ background: "#EFF6FF", color: "#1D4ED8", border: "1px solid rgba(59,130,246,0.2)" }}
                >
                  <Download size={14} /> Export PDF
                </button>
                <div className="flex items-center gap-2 text-[12px]" style={{ color: "#64748B" }}>
                  <CircleAlert size={14} />
                  Export wiring can be connected to a backend PDF endpoint.
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
