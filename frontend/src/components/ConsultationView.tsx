"use client";
import { useState, useEffect, useRef } from "react";
import { Mic, Square, Pause, Play, FileText, Brain } from "lucide-react";

const TRANSCRIPT_LINES = [
  { speaker: "Doctor", text: "Good morning. What brings you in today?" },
  { speaker: "Patient", text: "I have been having a bad headache for three days. I also feel hot and very tired." },
  { speaker: "Doctor", text: "I see. Any nausea or vomiting?" },
  { speaker: "Patient", text: "Some nausea but no vomiting. Also not eating much." },
  { speaker: "Doctor", text: "Any allergies to medications? Do you take any medicines regularly?" },
  { speaker: "Patient", text: "No allergies. No regular medicines. I had flu last year." },
  { speaker: "Doctor", text: "Okay. Let me check your temperature and blood pressure now." },
];

const AI_UPDATES = [
  { delay: 3000, field: "complaint", value: "Persistent headache × 3 days with low-grade fever and fatigue." },
  { delay: 5500, field: "symptoms", value: "Headache · Fever · Fatigue · Nausea · Reduced appetite" },
  { delay: 9000, field: "history", value: "No known drug allergies. History of seasonal flu. No chronic conditions." },
  { delay: 12000, field: "diagnosis", value: "Likely viral fever / URTI. Rule out dengue if thrombocytopenia present." },
  { delay: 13000, field: "rx", value: "Paracetamol 500mg TID × 5d · ORS · Vitamin C 500mg OD" },
  { delay: 13500, field: "followup", value: "Review in 3 days. CBC if fever persists beyond 72h." },
];

const NOTE_SECTIONS = [
  { id: "complaint", label: "Chief Complaint", color: "#2563EB" },
  { id: "symptoms", label: "Symptoms", color: "#D97706" },
  { id: "history", label: "Medical History", color: "#059669" },
  { id: "diagnosis", label: "Possible Diagnosis", color: "#DC2626" },
  { id: "rx", label: "Suggested Prescription", color: "#7C3AED" },
  { id: "followup", label: "Follow-up", color: "#0891B2" },
];

export function ConsultationView({ onComplete }: { onComplete: () => void }) {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState<{ speaker: string; text: string }[]>([]);
  const [aiData, setAiData] = useState<Record<string, string>>({});
  const [lineIdx, setLineIdx] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lineRef = useRef<NodeJS.Timeout | null>(null);
  const aiTimers = useRef<NodeJS.Timeout[]>([]);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  function startRecording() {
    setRecording(true);
    setPaused(false);
    setElapsed(0);
    setTranscript([]);
    setAiData({});
    setLineIdx(0);
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    scheduleLines(0);
    aiTimers.current = AI_UPDATES.map(u =>
      setTimeout(() => setAiData(d => ({ ...d, [u.field]: u.value })), u.delay)
    );
  }

  function scheduleLines(idx: number) {
    if (idx >= TRANSCRIPT_LINES.length) return;
    lineRef.current = setTimeout(() => {
      setTranscript(t => [...t, TRANSCRIPT_LINES[idx]]);
      setLineIdx(idx + 1);
      scheduleLines(idx + 1);
    }, idx === 0 ? 400 : 2200);
  }

  function togglePause() {
    if (paused) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
      setPaused(false);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (lineRef.current) clearTimeout(lineRef.current);
      setPaused(true);
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (lineRef.current) clearTimeout(lineRef.current);
    aiTimers.current.forEach(t => clearTimeout(t));
    setRecording(false);
    onComplete();
  }

  const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const secs = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="flex flex-col gap-4">
      {/* Patient info */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "#FFFFFF", border: "1px solid rgba(59,130,246,0.09)", boxShadow: "0 2px 12px rgba(59,130,246,0.06)" }}
      >
        <h2 className="text-[14px] font-semibold mb-4 flex items-center gap-2" style={{ color: "#0F1F3D" }}>
          <span className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "#EFF6FF" }}>
            <FileText size={12} style={{ color: "#2563EB" }} />
          </span>
          Patient Details
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {[{ label: "Patient Name", placeholder: "Full name" }, { label: "Age", placeholder: "e.g. 34" }, { label: "Patient ID", placeholder: "OPD-2024-…" }].map(f => (
            <div key={f.label}>
              <label className="block text-[12px] font-medium mb-1" style={{ color: "#5B7394" }}>{f.label}</label>
              <input
                type="text" placeholder={f.placeholder}
                className="w-full rounded-xl px-3 py-[9px] text-[13.5px] outline-none transition-all"
                style={{
                  background: "#F8FAFC", border: "1.5px solid rgba(59,130,246,0.15)",
                  color: "#0F1F3D",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#60A5FA")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(59,130,246,0.15)")}
              />
            </div>
          ))}
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
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-all"
                    style={{ background: "#EF4444", color: "white", boxShadow: "0 2px 8px rgba(239,68,68,0.3)" }}
                  >
                    <Square size={14} />Stop &amp; Generate
                  </button>
                </>
              )}
              {!recording && (
                <button
                  onClick={startRecording}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-medium"
                  style={{ background: "#2563EB", color: "white", boxShadow: "0 2px 8px rgba(37,99,235,0.35)" }}
                >
                  <Mic size={14} />Start Consultation
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
            <div key={s.id} className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(59,130,246,0.1)" }}>
              <div
                className="px-3 py-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em]"
                style={{ background: "#F8FAFC", borderBottom: "1px solid rgba(59,130,246,0.07)", color: "#5B7394" }}
              >
                <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: s.color }} />
                {s.label}
              </div>
              <div className="px-3 py-[10px] text-[13px]" style={{ color: aiData[s.id] ? "#334155" : "#CBD5E1", fontStyle: aiData[s.id] ? "normal" : "italic", lineHeight: 1.6 }}>
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
            onClick={onComplete}
            className="w-full py-[10px] rounded-xl text-[13.5px] font-semibold flex items-center justify-center gap-2 transition-all"
            style={{
              background: "linear-gradient(135deg, #2563EB, #6366F1)",
              color: "white", boxShadow: "0 4px 14px rgba(37,99,235,0.35)"
            }}
          >
            <FileText size={15} />Generate Summary
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes pingRing { 0%{transform:scale(1);opacity:1} 80%,100%{transform:scale(1.35);opacity:0} }
      `}</style>
    </div>
  );
}
