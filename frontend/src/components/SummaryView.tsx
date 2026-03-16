"use client";
import { useEffect, useMemo, useState } from "react";
import { api, type SessionWorkspace, getPatientLabReports, API_BASE_URL } from "@/lib/api";
import { Download, RefreshCw, Save, CheckCircle2, CircleAlert, ChevronDown } from "lucide-react";

export function SummaryView({
  sessionId,
  onClearSelection,
  onSelectFromHistory,
}: {
  sessionId: string | null;
  onClearSelection: () => void;
  onSelectFromHistory: () => void;
}) {
  const buildTemplateBlocks = (payload: {
    notes?: string;
    symptoms?: string;
    examination?: string;
    issues?: string;
    plan?: string;
    advice?: string;
  }, editable = false) => {
    const blocks = [
      { title: "Notes", value: payload.notes, key: "notes" },
      { title: "Symptoms", value: payload.symptoms, key: "symptoms" },
      { title: "On Examination", value: payload.examination, key: "examination" },
      { title: "Issues", value: payload.issues, key: "issues" },
      { title: "Plan", value: payload.plan, key: "plan" },
      { title: "Advice", value: payload.advice, key: "advice" },
    ];
    return (
      <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {blocks.map((block) => (
          <div
            key={block.title}
            className="rounded-xl p-3"
            style={{ background: "#F8FAFC", border: "1px solid rgba(59,130,246,0.1)" }}
          >
            <div className="text-[11px] uppercase tracking-[0.08em]" style={{ color: "#94A3B8" }}>
              {block.title}
            </div>
            {editable ? (
              <textarea
                value={(summaryDraft as Record<string, string>)[block.key] || ""}
                onChange={(e) => {
                  setSummaryDraft((prev) => ({ ...prev, [block.key]: e.target.value }));
                }}
                onFocus={() => setEditingSummary(true)}
                className="mt-2 w-full rounded-lg px-2 py-2 text-[12px] outline-none resize-none"
                rows={3}
                style={{ background: "white", border: "1px solid rgba(59,130,246,0.15)" }}
                placeholder="-"
              />
            ) : (
              <div className="text-[13px] mt-1" style={{ color: "#334155", whiteSpace: "pre-wrap" }}>
                {block.value || "-"}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };
  const [workspace, setWorkspace] = useState<SessionWorkspace | null>(null);
  const [sessionLabReports, setSessionLabReports] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingPrescription, setEditingPrescription] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState({
    notes: "",
    symptoms: "",
    examination: "",
    issues: "",
    plan: "",
    advice: "",
  });

  const handleDownloadPdf = async () => {
    if (!sessionId) return;
    const pdf = await api.downloadOpdPdf(sessionId);
    const url = URL.createObjectURL(pdf);
    const link = document.createElement("a");
    link.href = url;
    link.download = `opd-card-${sessionId}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPdf = async () => {
    if (!sessionId) return;
    const pdf = await api.downloadOpdPdf(sessionId);
    const url = URL.createObjectURL(pdf);
    const printWindow = window.open(url, "_blank");
    if (!printWindow) return;
    printWindow.focus();
  };
  const [prescriptionDraft, setPrescriptionDraft] = useState({
    diagnosisText: "",
    advice: "",
    followUp: "",
    warnings: "",
    items: [{ medicineName: "", strength: "", dose: "", frequency: "" }],
  });

  const loadWorkspace = async () => {
    if (!sessionId) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.getSessionWorkspaceData(sessionId);
      setWorkspace(data);
      // Fetch lab reports for the patient
      const patientId = typeof data.session?.patientId === "string" ? data.session.patientId : data.session?.patientId?._id;
      if (patientId) {
        const labReports = await getPatientLabReports(patientId);
        setSessionLabReports(labReports);
      } else {
        setSessionLabReports([]);
      }
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Unable to load session summary");
    } finally {
      setLoading(false);
    }
  };

  const handleClearSelection = () => {
    onClearSelection();
  };

  useEffect(() => {
    void loadWorkspace();
  }, [sessionId]);

  useEffect(() => {
    if (!workspace?.prescription) return;
    setPrescriptionDraft({
      diagnosisText: workspace.prescription.diagnosisText || "",
      advice: workspace.prescription.advice || "",
      followUp: workspace.note?.plan || workspace.prescription.followUp || "",
      warnings: (workspace.prescription.warnings || []).join("\n"),
      items: (workspace.prescription.items || []).length
        ? (workspace.prescription.items || []).map((item) => ({
            medicineName: item.medicineName || "",
            strength: item.strength || "",
            dose: item.dose || "",
            frequency: item.frequency || "",
          }))
        : [{ medicineName: "", strength: "", dose: "", frequency: "" }],
    });
    setEditingPrescription(false);
  }, [workspace?.prescription?._id]);

  useEffect(() => {
    if (!workspace?.note) return;
    setSummaryDraft({
      notes: workspace.note.doctorNotes || "",
      symptoms: (workspace.note.symptoms || []).join(", "),
      examination: workspace.note.examinationFindings || "",
      issues: workspace.note.diagnosisSummary || "",
      plan: workspace.note.plan || "",
      advice: workspace.prescription?.advice || "",
    });
    setEditingSummary(false);
  }, [workspace?.note?._id, workspace?.prescription?._id]);

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

  const handleSavePrescription = async () => {
    if (!sessionId) return;
    setSaving(true);
    setError("");
    try {
      await api.updateLatestNoteBySession(sessionId, {
        plan: prescriptionDraft.followUp,
      });
      await api.updateLatestPrescriptionBySession(sessionId, {
        diagnosisText: prescriptionDraft.diagnosisText,
        advice: prescriptionDraft.advice,
        followUp: workspace?.prescription?.followUp,
        warnings: prescriptionDraft.warnings
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        items: prescriptionDraft.items.filter((item) => item.medicineName.trim()),
      });
      await loadWorkspace();
      setEditingPrescription(false);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Unable to save prescription");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSummary = async () => {
    if (!sessionId) return;
    setSaving(true);
    setError("");
    try {
      await api.updateLatestNoteBySession(sessionId, {
        doctorNotes: summaryDraft.notes,
        symptoms: summaryDraft.symptoms
          .split(/[,\n;]/)
          .map((item) => item.trim())
          .filter(Boolean),
        examinationFindings: summaryDraft.examination,
        diagnosisSummary: summaryDraft.issues,
        plan: summaryDraft.plan,
      });
      await api.updateLatestPrescriptionBySession(sessionId, {
        advice: summaryDraft.advice,
      });
      await loadWorkspace();
      setEditingSummary(false);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Unable to save consultation summary");
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateAi = async () => {
    if (!sessionId) return;
    setSaving(true);
    setError("");
    try {
      await api.generateAiDraftFromTranscript(sessionId);
      await loadWorkspace();
      setEditingSummary(false);
      setEditingPrescription(false);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Unable to regenerate AI summary");
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
        <h2 className="text-lg font-bold" style={{ color: "#0F1F3D" }}>Select a Session</h2>
        <p className="text-sm mt-1" style={{ color: "#64748B" }}>
          Please select a consultation session to view its Medical Notes and Reports.
        </p>
        <button
          onClick={onSelectFromHistory}
          className="mt-4 px-4 py-2 rounded-xl text-[13px] font-semibold"
          style={{ background: "linear-gradient(135deg, #2563EB, #6366F1)", color: "white" }}
        >
          View History
        </button>
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
            onClick={handleClearSelection}
            className="flex items-center gap-2 px-3 py-[8px] rounded-xl text-[12px] font-medium"
            style={{ background: "#F8FAFC", color: "#334155", border: "1px solid rgba(59,130,246,0.15)" }}
          >
            <RefreshCw size={14} /> Clear Selection
          </button>
          <div className="relative">
            <button
              onClick={() => setExportOpen((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-[8px] rounded-xl text-[12px] font-medium"
              style={{ background: "linear-gradient(135deg, #2563EB, #6366F1)", color: "white" }}
            >
              <Save size={14} /> Export PDF <ChevronDown size={12} />
            </button>
            {exportOpen && (
              <div
                className="absolute right-0 mt-2 w-40 rounded-xl overflow-hidden"
                style={{ background: "white", border: "1px solid rgba(59,130,246,0.12)", boxShadow: "0 8px 20px rgba(15,23,42,0.12)" }}
              >
                <button
                  onClick={async () => {
                    setExportOpen(false);
                    try {
                      await handleDownloadPdf();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Unable to download PDF");
                    }
                  }}
                  className="w-full text-left px-4 py-2 text-[12px] hover:bg-slate-50"
                  style={{ color: "#0F1F3D" }}
                >
                  Download PDF
                </button>
                <button
                  onClick={async () => {
                    setExportOpen(false);
                    try {
                      await handlePrintPdf();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Unable to print PDF");
                    }
                  }}
                  className="w-full text-left px-4 py-2 text-[12px] hover:bg-slate-50"
                  style={{ color: "#0F1F3D" }}
                >
                  Print PDF
                </button>
              </div>
            )}
          </div>
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
                <h3 className="text-[15px] font-semibold" style={{ color: "#0F1F3D" }}>Consultation Summary</h3>
                <span className="text-[11px]" style={{ color: "#64748B" }}>
                  {workspace?.note?.status || "Not generated"}
                </span>
              </div>
              {workspace?.note ? (
                buildTemplateBlocks(
                  {
                    notes: summaryDraft.notes || workspace.note.doctorNotes,
                    symptoms: summaryDraft.symptoms || (workspace.note.symptoms || []).join(", "),
                    examination: summaryDraft.examination || workspace.note.examinationFindings,
                    issues: summaryDraft.issues || workspace.note.diagnosisSummary,
                    plan: summaryDraft.plan || workspace.note.plan,
                    advice: summaryDraft.advice || workspace.prescription?.advice,
                  },
                  true
                )
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
                {workspace?.note && (
                  <button
                    onClick={handleSaveSummary}
                    disabled={saving || !editingSummary}
                    className="flex items-center gap-2 px-3 py-[8px] rounded-xl text-[12px] font-medium disabled:opacity-60"
                    style={{ background: "#EFF6FF", color: "#1D4ED8", border: "1px solid rgba(59,130,246,0.2)" }}
                  >
                    <Save size={14} /> Save Summary
                  </button>
                )}
                {workspace?.note && (
                  <button
                    onClick={handleRegenerateAi}
                    disabled={saving}
                    className="flex items-center gap-2 px-3 py-[8px] rounded-xl text-[12px] font-medium"
                    style={{ background: "#FFF7ED", color: "#B45309", border: "1px solid rgba(251,191,36,0.3)" }}
                  >
                    Regenerate AI
                  </button>
                )}
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
                  {editingPrescription ? (
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="text-[11px] uppercase tracking-[0.06em]" style={{ color: "#94A3B8" }}>Diagnosis</label>
                        <input
                          value={prescriptionDraft.diagnosisText}
                          onChange={(e) => setPrescriptionDraft((prev) => ({ ...prev, diagnosisText: e.target.value }))}
                          className="mt-1 w-full rounded-xl px-3 py-2 text-[12px] outline-none"
                          style={{ background: "#F8FAFC", border: "1px solid rgba(59,130,246,0.15)" }}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] uppercase tracking-[0.06em]" style={{ color: "#94A3B8" }}>Advice</label>
                        <textarea
                          value={prescriptionDraft.advice}
                          onChange={(e) => setPrescriptionDraft((prev) => ({ ...prev, advice: e.target.value }))}
                          className="mt-1 w-full rounded-xl px-3 py-2 text-[12px] outline-none resize-none"
                          rows={2}
                          style={{ background: "#F8FAFC", border: "1px solid rgba(59,130,246,0.15)" }}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] uppercase tracking-[0.06em]" style={{ color: "#94A3B8" }}>Plan</label>
                        <textarea
                          value={prescriptionDraft.followUp}
                          onChange={(e) => setPrescriptionDraft((prev) => ({ ...prev, followUp: e.target.value }))}
                          className="mt-1 w-full rounded-xl px-3 py-2 text-[12px] outline-none resize-none"
                          rows={2}
                          style={{ background: "#F8FAFC", border: "1px solid rgba(59,130,246,0.15)" }}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] uppercase tracking-[0.06em]" style={{ color: "#94A3B8" }}>Warnings</label>
                        <textarea
                          value={prescriptionDraft.warnings}
                          onChange={(e) => setPrescriptionDraft((prev) => ({ ...prev, warnings: e.target.value }))}
                          className="mt-1 w-full rounded-xl px-3 py-2 text-[12px] outline-none resize-none"
                          rows={2}
                          style={{ background: "#F8FAFC", border: "1px solid rgba(59,130,246,0.15)" }}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[11px] uppercase tracking-[0.06em]" style={{ color: "#94A3B8" }}>Medicines</label>
                        {prescriptionDraft.items.map((item, idx) => (
                          <div key={idx} className="grid gap-2" style={{ gridTemplateColumns: "1.2fr 1fr 1fr 1fr" }}>
                            <input
                              placeholder="Medicine"
                              value={item.medicineName}
                              onChange={(e) => {
                                const value = e.target.value;
                                setPrescriptionDraft((prev) => {
                                  const next = [...prev.items];
                                  next[idx] = { ...next[idx], medicineName: value };
                                  return { ...prev, items: next };
                                });
                              }}
                              className="rounded-lg px-2 py-2 text-[12px] outline-none"
                              style={{ background: "#F8FAFC", border: "1px solid rgba(59,130,246,0.15)" }}
                            />
                            <input
                              placeholder="Strength"
                              value={item.strength}
                              onChange={(e) => {
                                const value = e.target.value;
                                setPrescriptionDraft((prev) => {
                                  const next = [...prev.items];
                                  next[idx] = { ...next[idx], strength: value };
                                  return { ...prev, items: next };
                                });
                              }}
                              className="rounded-lg px-2 py-2 text-[12px] outline-none"
                              style={{ background: "#F8FAFC", border: "1px solid rgba(59,130,246,0.15)" }}
                            />
                            <input
                              placeholder="Dose"
                              value={item.dose}
                              onChange={(e) => {
                                const value = e.target.value;
                                setPrescriptionDraft((prev) => {
                                  const next = [...prev.items];
                                  next[idx] = { ...next[idx], dose: value };
                                  return { ...prev, items: next };
                                });
                              }}
                              className="rounded-lg px-2 py-2 text-[12px] outline-none"
                              style={{ background: "#F8FAFC", border: "1px solid rgba(59,130,246,0.15)" }}
                            />
                            <input
                              placeholder="Frequency"
                              value={item.frequency}
                              onChange={(e) => {
                                const value = e.target.value;
                                setPrescriptionDraft((prev) => {
                                  const next = [...prev.items];
                                  next[idx] = { ...next[idx], frequency: value };
                                  return { ...prev, items: next };
                                });
                              }}
                              className="rounded-lg px-2 py-2 text-[12px] outline-none"
                              style={{ background: "#F8FAFC", border: "1px solid rgba(59,130,246,0.15)" }}
                            />
                          </div>
                        ))}
                        <button
                          onClick={() =>
                            setPrescriptionDraft((prev) => ({
                              ...prev,
                              items: [...prev.items, { medicineName: "", strength: "", dose: "", frequency: "" }],
                            }))
                          }
                          className="self-start px-3 py-1 rounded-lg text-[11px] font-semibold"
                          style={{ background: "#EFF6FF", color: "#1D4ED8" }}
                        >
                          Add medicine
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p><strong>Diagnosis:</strong> {workspace.prescription.diagnosisText || "-"}</p>
                      <p><strong>Advice:</strong> {workspace.prescription.advice || "-"}</p>
                      <p><strong>Follow Up:</strong> {workspace.prescription.followUp || "-"}</p>
                      <p><strong>Items:</strong> {(workspace.prescription.items || []).length}</p>
                    </>
                  )}
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
                {workspace?.prescription && (
                  editingPrescription ? (
                    <button
                      onClick={handleSavePrescription}
                      disabled={saving}
                      className="flex items-center gap-2 px-3 py-[8px] rounded-xl text-[12px] font-medium"
                      style={{ background: "#EFF6FF", color: "#1D4ED8", border: "1px solid rgba(59,130,246,0.2)" }}
                    >
                      <Save size={14} /> Save Changes
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditingPrescription(true)}
                      className="flex items-center gap-2 px-3 py-[8px] rounded-xl text-[12px] font-medium"
                      style={{ background: "#EFF6FF", color: "#1D4ED8", border: "1px solid rgba(59,130,246,0.2)" }}
                    >
                      <Save size={14} /> Edit Prescription
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          {workspace?.note?.rawAiPayload?.lastVisitNote && (
            <div className="rounded-2xl p-5" style={{ background: "#FFFFFF", border: "1px solid rgba(59,130,246,0.09)" }}>
              <h3 className="text-[15px] font-semibold mb-2" style={{ color: "#0F1F3D" }}>Last Visit Note (Context)</h3>
              <div className="text-[13px]" style={{ color: "#334155", lineHeight: 1.6 }}>
                {workspace.note.rawAiPayload.lastVisitNote}
              </div>
            </div>
          )}

          <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="rounded-2xl p-5" style={{ background: "white", border: "1px solid rgba(59,130,246,0.09)" }}>
              <h3 className="text-[15px] font-semibold mb-3" style={{ color: "#0F1F3D" }}>Lab Reports</h3>
              {!sessionLabReports.length ? (
                <p className="text-[13px]" style={{ color: "#94A3B8" }}>No lab reports found for this patient.</p>
              ) : (
                <ul className="text-[13px]" style={{ color: "#334155" }}>
                  {sessionLabReports.map((report) => (
                    <li key={report._id} className="py-1">
                      <a href={API_BASE_URL + report.pdfUrl} target="_blank" rel="noopener" style={{ color: "#2563EB", textDecoration: "underline" }}>
                        {report.panelName} ({report.department})
                      </a>
                      <span style={{ color: "#64748B", marginLeft: 8 }}>
                        {report.collectedAt ? new Date(report.collectedAt).toLocaleString() : ""}
                      </span>
                      {report.remarks && <div style={{ color: "#DC2626", fontSize: 12 }}>{report.remarks}</div>}
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
