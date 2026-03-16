"use client";
import { useState, useEffect, useRef } from "react";
import { Mic, Square, Pause, Play, FileText, Brain, Search, User } from "lucide-react";
import { api, type Patient } from "@/lib/api";

const NOTE_SECTIONS = [
  { id: "complaint", label: "Notes", color: "#2563EB" },
  { id: "symptoms", label: "Symptoms", color: "#D97706" },
  { id: "history", label: "On Examination", color: "#059669" },
  { id: "diagnosis", label: "Issues", color: "#DC2626" },
  { id: "rx", label: "Plan", color: "#7C3AED" },
  { id: "followup", label: "Advice", color: "#0891B2" },
];

export function ConsultationView({ onComplete }: { onComplete: (sessionId: string) => void }) {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState<{ speaker: string; text: string }[]>([]);
  const [aiData, setAiData] = useState<Record<string, string>>({});
  const [sectionToggles, setSectionToggles] = useState<Record<string, boolean>>({
    complaint: true,
    symptoms: true,
    history: true,
    diagnosis: true,
    rx: true,
    followup: true,
  });
  const [patientSearch, setPatientSearch] = useState("");
  const [fetchedPatient, setFetchedPatient] = useState<Patient | null>(null);
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [encounterType, setEncounterType] = useState("OPD");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasUploaded, setHasUploaded] = useState(false);
  const [transcriptSaved, setTranscriptSaved] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  async function findPatient() {
    if (!patientSearch.trim()) {
      setError("Please enter a patient ID or name to search");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.getPatients({ q: patientSearch.trim() });
      if (res.items && res.items.length > 0) {
        setFetchedPatient(res.items[0]);
      } else {
        setFetchedPatient(null);
        setError("Patient not found. Please try another search term.");
      }
    } catch (err) {
      setFetchedPatient(null);
      setError(err instanceof Error ? err.message : "Error finding patient");
    } finally {
      setLoading(false);
    }
  }

  async function startRecording() {
    if (import.meta.env.DEV) {
      console.log("[consultation] startRecording clicked");
    }
    if (!fetchedPatient?._id) {
      setError("Please act on a fetched patient first to start consultation");
      return;
    }

    setError("");
    setLoading(true);
    let activeSessionId: string | null = sessionId;
    try {
      if (!activeSessionId) {
        const session = await api.createSession({
          patientId: fetchedPatient._id,
          encounterType: encounterType.trim() || "OPD",
          chiefComplaint: chiefComplaint.trim() || undefined,
        });
        setSessionId(session._id);
        activeSessionId = session._id;
      }
      await api.startSessionRecording(activeSessionId);
      if (import.meta.env.DEV) {
        console.log("[consultation] session started", { sessionId: activeSessionId });
      }
    } catch (apiError) {
      setLoading(false);
      setError(apiError instanceof Error ? apiError.message : "Unable to start consultation");
      return;
    }

    try {
      if (import.meta.env.DEV) {
        console.log("[consultation] requesting microphone access");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const preferredMime = "audio/webm;codecs=opus";
      const options: MediaRecorderOptions =
        "MediaRecorder" in window && MediaRecorder.isTypeSupported(preferredMime)
          ? { mimeType: preferredMime }
          : {};
      const recorder = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      if (import.meta.env.DEV) {
        console.log("[consultation] recorder started");
      }

      setRecording(true);
      setPaused(false);
      if (!sessionId) {
        setElapsed(0);
        setTranscript([]);
        setAiData({});
        setHasUploaded(false);
        setTranscriptSaved(false);
      }
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      setLoading(false);
    } catch (mediaError) {
      setLoading(false);
      if (import.meta.env.DEV) {
        console.error("[consultation] microphone error", mediaError);
      }
      setError(mediaError instanceof Error ? mediaError.message : "Unable to access microphone");
    }
  }

  function togglePause() {
    if (paused) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
        mediaRecorderRef.current.resume();
      }
      setPaused(false);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.pause();
      }
      setPaused(true);
    }
  }

  async function stopAndCollectAudio(): Promise<Blob | null> {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return null;
    if (recorder.state === "inactive") {
      if (audioChunksRef.current.length === 0) return null;
      return new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
    }

    return await new Promise((resolve) => {
      recorder.addEventListener(
        "stop",
        () => {
          const blob = new Blob(audioChunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });
          resolve(blob);
        },
        { once: true }
      );
      recorder.stop();
    });
  }

  async function stopRecording() {
    if (import.meta.env.DEV) {
      console.log("[consultation] stopRecording clicked");
    }
    if (!sessionId) {
      setError("No active consultation session found");
      return;
    }

    setLoading(true);
    setError("");
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      await api.stopSessionRecording(sessionId);
      if (import.meta.env.DEV) {
        console.log("[consultation] session stopped", { sessionId });
      }

      const audioBlob = await stopAndCollectAudio();
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error("No audio captured. Please try again.");
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }

      const audioFile = new File([audioBlob], `session-${sessionId}.webm`, {
        type: audioBlob.type || "audio/webm",
      });
      if (import.meta.env.DEV) {
        console.log("[consultation] uploading audio", { size: audioFile.size, type: audioFile.type });
      }
      const uploadResponse = await api.uploadSessionAudio(sessionId, audioFile);
      if (import.meta.env.DEV) {
        console.log("[consultation] upload response", uploadResponse);
      }
      setHasUploaded(true);
      setTranscriptSaved(false);

      if (uploadResponse.analysis) {
        setAiData((prev) => ({
          complaint: uploadResponse.analysis.notes || prev.complaint || "",
          symptoms: uploadResponse.analysis.symptoms || prev.symptoms || "",
          history: uploadResponse.analysis.examination || prev.history || "",
          diagnosis: uploadResponse.analysis.issues || prev.diagnosis || "",
          rx: uploadResponse.analysis.plan || prev.rx || "",
          followup: uploadResponse.analysis.advice || prev.followup || "",
        }));
      }

      if (uploadResponse.segments?.length) {
        const lines = uploadResponse.segments
          .slice()
          .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
          .map((segment) => ({
            speaker: segment.speakerRole === "DOCTOR" ? "Doctor" : segment.speakerRole === "PATIENT" ? "Patient" : "Other",
            text: segment.text,
          }));
        setTranscript((prev) => (prev.length ? [...prev, ...lines] : lines));
      }

      setRecording(false);
    } catch (apiError) {
      if (import.meta.env.DEV) {
        console.error("[consultation] stop error", apiError);
      }
      setError(apiError instanceof Error ? apiError.message : "Unable to upload audio for transcription");
    } finally {
      mediaRecorderRef.current = null;
      setPaused(false);
      setRecording(false);
      setLoading(false);
    }
  }

  async function generatePrescriptionAndNotes() {
    if (!sessionId) {
      setError("Start consultation first to generate prescription");
      return;
    }
    if (!hasUploaded) {
      setError("Stop & Transcribe first to upload audio");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await api.generateAiDraftFromTranscript(sessionId);
      onComplete(sessionId);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Unable to generate prescription");
    } finally {
      setLoading(false);
    }
  }

  const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const secs = String(elapsed % 60).padStart(2, "0");
  const sessionStarted = Boolean(sessionId);

  return (
    <div className="flex flex-col gap-4">
      {/* Patient info */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1.2fr 0.8fr" }}>
        <div
          className="rounded-2xl p-5"
          style={{ background: "#FFFFFF", border: "1px solid rgba(59,130,246,0.09)", boxShadow: "0 2px 12px rgba(59,130,246,0.06)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-semibold flex items-center gap-2" style={{ color: "#0F1F3D" }}>
              <span className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "#EFF6FF" }}>
                <FileText size={12} style={{ color: "#2563EB" }} />
              </span>
              Patient & Visit
            </h2>
            <span className="text-[11px] uppercase tracking-[0.08em]" style={{ color: "#94A3B8" }}>
              Step 1
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[12px] font-medium mb-1" style={{ color: "#5B7394" }}>Find Patient</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="Name or ID"
                  className="flex-1 rounded-xl px-3 py-[9px] text-[13.5px] outline-none transition-all"
                  style={{ background: "#F8FAFC", border: "1.5px solid rgba(59,130,246,0.15)", color: "#0F1F3D" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#60A5FA")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(59,130,246,0.15)")}
                  onKeyDown={(e) => e.key === 'Enter' && findPatient()}
                />
                <button
                  onClick={findPatient}
                  disabled={loading}
                  className="px-3 rounded-xl flex items-center justify-center transition-all bg-blue-600 hover:bg-blue-700 text-white"
                  style={{
                    boxShadow: "0 2px 8px rgba(37,99,235,0.35)",
                  }}
                >
                  <Search size={14} />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1" style={{ color: "#5B7394" }}>Encounter Type</label>
              <input
                type="text"
                value={encounterType}
                onChange={(e) => setEncounterType(e.target.value)}
                placeholder="OPD / Follow-up"
                className="w-full rounded-xl px-3 py-[9px] text-[13.5px] outline-none transition-all"
                style={{ background: "#F8FAFC", border: "1.5px solid rgba(59,130,246,0.15)", color: "#0F1F3D" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#60A5FA")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(59,130,246,0.15)")}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1" style={{ color: "#5B7394" }}>Chief Complaint</label>
              <input
                type="text"
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                placeholder="Main symptom"
                className="w-full rounded-xl px-3 py-[9px] text-[13.5px] outline-none transition-all"
                style={{ background: "#F8FAFC", border: "1.5px solid rgba(59,130,246,0.15)", color: "#0F1F3D" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#60A5FA")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(59,130,246,0.15)")}
              />
            </div>
          </div>
          {fetchedPatient && (
            <div className="mt-4 p-4 rounded-xl flex items-center justify-between" style={{ background: "#F0F9FF", border: "1px solid #BAE6FD" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <User size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-slate-800">{fetchedPatient.fullName}</p>
                  <div className="flex items-center gap-2 text-[12px] text-slate-500 mt-0.5">
                    <span className="font-medium bg-blue-100/50 text-blue-700 px-1.5 py-0.5 rounded">{fetchedPatient.patientGlobalId}</span>
                    {fetchedPatient.age && <span>• {fetchedPatient.age} yrs</span>}
                    {fetchedPatient.sex && <span className="capitalize">• {fetchedPatient.sex}</span>}
                    {fetchedPatient.phone && <span>• {fetchedPatient.phone}</span>}
                  </div>
                </div>
              </div>
            </div>
          )}
          {error && (
            <p className="text-[12px] mt-2" style={{ color: "#DC2626" }}>{error}</p>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div
            className="rounded-2xl p-5"
            style={{ background: "#FFFFFF", border: "1px solid rgba(59,130,246,0.09)", boxShadow: "0 2px 12px rgba(59,130,246,0.06)" }}
          >
            <h3 className="text-[13px] font-semibold mb-3" style={{ color: "#0F1F3D" }}>Session Snapshot</h3>
            <div className="flex flex-col gap-2 text-[12px]" style={{ color: "#5B7394" }}>
              <div className="flex items-center justify-between">
                <span>Session ID</span>
                <span style={{ color: sessionId ? "#0F1F3D" : "#94A3B8" }}>{sessionId || "Not started"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Recording</span>
                <span style={{ color: recording ? "#EF4444" : "#94A3B8" }}>{recording ? (paused ? "Paused" : "Live") : "Idle"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Elapsed</span>
                <span style={{ color: "#0F1F3D" }}>{mins}:{secs}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Audio Upload</span>
                <span style={{ color: hasUploaded ? "#059669" : "#94A3B8" }}>{hasUploaded ? "Uploaded" : "Pending"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Transcript Save</span>
                <span style={{ color: transcriptSaved ? "#059669" : "#94A3B8" }}>{transcriptSaved ? "Saved" : "Not saved"}</span>
              </div>
            </div>
            <div className="mt-3 text-[11px]" style={{ color: "#94A3B8" }}>
              Use “Stop & Transcribe” after recording, then “Generate Transcription” to save.
            </div>
          </div>
        </div>
      </div>

      {/* Recording + AI panel */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 380px" }}>
        {/* Recorder */}
        <div
          className="rounded-2xl p-5 flex flex-col"
          style={{ background: "#FFFFFF", border: "1px solid rgba(59,130,246,0.09)", boxShadow: "0 2px 12px rgba(59,130,246,0.06)" }}
        >
          <h2 className="text-[14px] font-semibold mb-4 flex items-center gap-2" style={{ color: "#0F1F3D" }}>
            <span className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "#FFF1F2" }}>
              <Mic size={12} style={{ color: "#E11D48" }} />
            </span>
            Recording
          </h2>

          {/* Mic button */}
          <div className="flex flex-col items-center py-6 gap-4">
            {recording && (
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: "#EF4444",
                    animation: "pulse 1.2s ease infinite",
                    boxShadow: "0 0 6px rgba(239,68,68,0.6)"
                  }}
                />
                <span className="text-[13px] font-medium" style={{ color: "#5B7394" }}>
                  {paused ? "Paused" : "Recording…"}
                </span>
              </div>
            )}
            <div className="relative">
              {recording && !paused && (
                <div
                  className="absolute inset-0 rounded-full"
                  style={{ animation: "pingRing 1.5s ease-out infinite", border: "2px solid rgba(239,68,68,0.4)" }}
                />
              )}
              <button
                onClick={recording ? togglePause : startRecording}
                className="relative w-[90px] h-[90px] rounded-full flex items-center justify-center transition-all duration-200"
                style={{
                  background: recording
                    ? paused
                      ? "linear-gradient(135deg, #3B82F6, #6366F1)"
                      : "linear-gradient(135deg, #EF4444, #DC2626)"
                    : "linear-gradient(135deg, #2563EB, #6366F1)",
                  boxShadow: recording
                    ? paused
                      ? "0 6px 24px rgba(99,102,241,0.45)"
                      : "0 6px 24px rgba(239,68,68,0.45)"
                    : "0 6px 24px rgba(37,99,235,0.45)",
                }}
              >
                {!recording ? <Mic size={32} color="white" />
                  : paused ? <Play size={28} color="white" />
                  : <Pause size={28} color="white" />}
              </button>
            </div>

            <div
              className="text-[28px] font-semibold tracking-[3px]"
              style={{
                color: recording ? (paused ? "#5B7394" : "#EF4444") : "#CBD5E1",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {mins}:{secs}
            </div>

            <div className="flex gap-3">
              {recording && (
                <>
                  <button
                    onClick={togglePause}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-all"
                    style={{ background: "#F8FAFC", color: "#5B7394", border: "1.5px solid rgba(59,130,246,0.15)" }}
                  >
                    {paused ? <><Play size={14} />Resume</> : <><Pause size={14} />Pause</>}
                  </button>
                  <button
                    onClick={stopRecording}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-all"
                    style={{ background: "#EF4444", color: "white", boxShadow: "0 2px 8px rgba(239,68,68,0.3)" }}
                  >
                    <Square size={14} />{loading ? "Processing..." : "Stop & Transcribe"}
                  </button>
                </>
              )}
              {!recording && (
                <button
                  onClick={startRecording}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-medium"
                  style={{ background: "#2563EB", color: "white", boxShadow: "0 2px 8px rgba(37,99,235,0.35)" }}
                >
                  <Mic size={14} />{loading ? "Starting..." : "Start Consultation"}
                </button>
              )}
            </div>
          </div>

          {/* Live transcript */}
          <div className="mt-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] mb-2" style={{ color: "#94A3B8" }}>
              Live Transcript
            </p>
            <div
              ref={transcriptRef}
              className="rounded-xl p-4 overflow-y-auto text-[13px] leading-relaxed"
              style={{
                background: "#F8FAFC", border: "1px solid rgba(59,130,246,0.1)",
                height: 150, fontFamily: "JetBrains Mono, monospace",
                color: "#334155"
              }}
            >
              {transcript.length === 0 ? (
                <span style={{ color: "#94A3B8", fontStyle: "italic" }}>
                  Transcript will appear here during recording…
                </span>
              ) : (
                transcript.map((line, i) => (
                  <p key={i} style={{ marginBottom: 6 }}>
                    <strong style={{ color: line.speaker === "Doctor" ? "#2563EB" : "#059669" }}>
                      {line.speaker}:
                    </strong>{" "}
                    {line.text}
                  </p>
                ))
              )}
            </div>
          </div>
        </div>

        {/* AI Analysis */}
        <div
          className="rounded-2xl p-5 flex flex-col gap-3 overflow-y-auto"
          style={{
            background: "#FFFFFF", border: "1px solid rgba(59,130,246,0.09)",
            boxShadow: "0 2px 12px rgba(59,130,246,0.06)", maxHeight: 520
          }}
        >
          <h2 className="text-[14px] font-semibold flex items-center gap-2" style={{ color: "#0F1F3D" }}>
            <span className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "#F5F3FF" }}>
              <Brain size={12} style={{ color: "#7C3AED" }} />
            </span>
            AI Analysis
          </h2>
          {NOTE_SECTIONS.map((s) => (
            <div key={s.id} className={`rounded-xl overflow-hidden transition-all ${!sectionToggles[s.id] ? "opacity-60 grayscale" : ""}`} style={{ border: "1px solid rgba(59,130,246,0.1)" }}>
              <div
                className="px-3 py-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.06em]"
                style={{ background: "#F8FAFC", borderBottom: "1px solid rgba(59,130,246,0.07)", color: "#5B7394" }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: s.color }} />
                  {s.label}
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={!!sectionToggles[s.id]}
                    onChange={(e) => setSectionToggles((prev) => ({ ...prev, [s.id]: e.target.checked }))}
                  />
                  <div className={`w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all ${sectionToggles[s.id] ? "bg-blue-600 border-blue-600" : ""}`}></div>
                </label>
              </div>
              <div
                className="px-3 py-[10px] text-[13px] transition-all"
                style={{
                  color: aiData[s.id] ? "#334155" : "#CBD5E1",
                  fontStyle: aiData[s.id] ? "normal" : "italic",
                  lineHeight: 1.6,
                  display: sectionToggles[s.id] ? "block" : "none"
                }}
              >
                {aiData[s.id] || "Listening…"}
              </div>
            </div>
          ))}
          <div className="mt-1">
            <textarea
              placeholder="Add your notes here…"
              className="w-full rounded-xl px-3 py-2 text-[13px] outline-none resize-none"
              rows={3}
              style={{
                background: "#F8FAFC", border: "1.5px solid rgba(59,130,246,0.15)",
                color: "#334155", fontFamily: "inherit"
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "#60A5FA")}
              onBlur={e => (e.currentTarget.style.borderColor = "rgba(59,130,246,0.15)")}
            />
          </div>
          <button
            onClick={generatePrescriptionAndNotes}
            disabled={loading || !sessionId || !hasUploaded}
            className="w-full py-[10px] rounded-xl text-[13.5px] font-semibold flex items-center justify-center gap-2 transition-all"
            style={{
              background: "linear-gradient(135deg, #2563EB, #6366F1)",
              color: "white", boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
              opacity: loading || !sessionId || !hasUploaded ? 0.6 : 1
            }}
          >
            <FileText size={15} />Generate Prescription
          </button>
          <div className="mt-2 text-[11px] text-center" style={{ color: "#94A3B8" }}>
            Generate prescription and medical notes after audio is uploaded.
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes pingRing { 0%{transform:scale(1);opacity:1} 80%,100%{transform:scale(1.35);opacity:0} }
      `}</style>
    </div>
  );
}
