"use client";
import { Download, Copy, Save, Plus, Heart, AlertTriangle, BookOpen, FlaskConical, Pill, Clock, Stethoscope } from "lucide-react";

const SECTIONS = [
  {
    id: "complaint", icon: Heart, iconBg: "#EFF6FF", iconColor: "#2563EB",
    label: "Chief Complaint",
    content: "Patient presents with persistent headache for 3 days, associated with mild fever (37.8°C), fatigue, and intermittent nausea. Onset gradual, no obvious trigger identified."
  },
  {
    id: "symptoms", icon: AlertTriangle, iconBg: "#FFFBEB", iconColor: "#D97706",
    label: "Symptoms Mentioned",
    isTagList: true,
    tags: [
      { text: "Headache (3 days)", style: "bg-amber-50 text-amber-700" },
      { text: "Fever 37.8°C", style: "bg-red-50 text-red-600" },
      { text: "Fatigue", style: "bg-blue-50 text-blue-700" },
      { text: "Mild nausea", style: "bg-blue-50 text-blue-700" },
      { text: "Reduced appetite", style: "bg-gray-100 text-gray-600" },
    ]
  },
  {
    id: "history", icon: BookOpen, iconBg: "#F0FDF4", iconColor: "#059669",
    label: "Medical History",
    content: "No known allergies (NKDA). History of seasonal influenza. No chronic conditions, no current medications. No recent travel outside Kathmandu reported."
  },
  {
    id: "diagnosis", icon: Stethoscope, iconBg: "#FFFBEB", iconColor: "#D97706",
    label: "Possible Diagnosis (AI Suggestion)",
    isWarning: true,
    content: "Primary: Viral fever, most likely upper respiratory tract infection (URTI).\n\nDifferential: Early dengue fever (if thrombocytopenia present). Recommend CBC with platelet count if fever persists beyond 3 days."
  },
  {
    id: "rx", icon: Pill, iconBg: "#F0FDF4", iconColor: "#059669",
    label: "Suggested Prescription",
    isList: true,
    items: [
      "Paracetamol 500mg — 1 tablet TID × 5 days",
      "ORS sachets — 1 in 1L water, 2–3 per day",
      "Vitamin C 500mg — once daily × 5 days",
      "Rest advised. Avoid cold exposure.",
    ]
  },
  {
    id: "followup", icon: Clock, iconBg: "#EFF6FF", iconColor: "#2563EB",
    label: "Follow-up Instructions",
    content: "Return in 3 days if fever persists or worsens. Seek immediate care if rash, severe headache, or bleeding symptoms appear. CBC with platelet count recommended if fever not resolved in 72 hours."
  },
];

export function SummaryView({ onNew }: { onNew: () => void }) {
  return (
    <div>
      {/* Patient header */}
      <div
        className="rounded-2xl p-5 mb-5 flex items-center gap-5"
        style={{
          background: "linear-gradient(135deg, #1D4ED8 0%, #4F46E5 100%)",
          boxShadow: "0 6px 28px rgba(37,99,235,0.35)",
        }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-[22px] font-bold text-white flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.18)", border: "2.5px solid rgba(255,255,255,0.35)" }}
        >
          RT
        </div>
        <div className="flex-1">
          <h1 className="text-white text-[20px] font-bold tracking-[-0.3px]">Ram Bahadur Thapa</h1>
          <p className="text-[13px] mt-[3px]" style={{ color: "rgba(255,255,255,0.7)" }}>
            OPD-2024-042 · Male, 32 yrs · Dr. Dipa Sharma · Today 10:45 AM
          </p>
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <p className="text-white text-[20px] font-bold">06:32</p>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.6)" }}>Duration</p>
          </div>
          <div>
            <p className="text-white text-[20px] font-bold">7</p>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.6)" }}>Sections</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 252px" }}>
        {/* Note sections */}
        <div className="flex flex-col gap-3">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.id}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "#FFFFFF",
                  border: s.isWarning ? "1px solid rgba(217,119,6,0.35)" : "1px solid rgba(59,130,246,0.09)",
                  boxShadow: "0 1px 8px rgba(59,130,246,0.05)",
                }}
              >
                <div
                  className="flex items-center gap-3 px-5 py-3"
                  style={{
                    background: s.isWarning ? "#FFFBEB" : "#FAFCFF",
                    borderBottom: `1px solid ${s.isWarning ? "rgba(217,119,6,0.15)" : "rgba(59,130,246,0.07)"}`,
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: s.iconBg }}
                  >
                    <Icon size={14} style={{ color: s.iconColor }} />
                  </div>
                  <span className="text-[12px] font-semibold uppercase tracking-[0.05em]" style={{ color: "#5B7394" }}>
                    {s.label}
                  </span>
                  {s.isWarning && (
                    <span
                      className="ml-auto text-[10px] font-semibold px-2 py-[2px] rounded-full"
                      style={{ background: "#FEF3C7", color: "#D97706", border: "1px solid rgba(217,119,6,0.25)" }}
                    >
                      AI Suggestion — Review Required
                    </span>
                  )}
                </div>
                <div className="px-5 py-4 text-[14px] leading-relaxed" style={{ color: "#334155" }}>
                  {s.isTagList ? (
                    <div className="flex flex-wrap gap-2">
                      {s.tags!.map((tag, i) => (
                        <span key={i} className={`text-[12px] font-medium px-3 py-1 rounded-full ${tag.style}`}>
                          {tag.text}
                        </span>
                      ))}
                    </div>
                  ) : s.isList ? (
                    <ol className="flex flex-col gap-[6px] list-none">
                      {s.items!.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-[1px]"
                            style={{ background: "#EFF6FF", color: "#2563EB" }}
                          >{i + 1}</span>
                          {item}
                        </li>
                      ))}
                    </ol>
                  ) : s.id === "notes" ? (
                    <textarea
                      className="w-full rounded-xl px-3 py-2 text-[13.5px] outline-none resize-none"
                      rows={3}
                      defaultValue="BP: 118/78 mmHg. Temperature 37.8°C. Patient appeared mildly distressed. Throat: slightly erythematous."
                      style={{
                        background: "#F8FAFC", border: "1.5px solid rgba(59,130,246,0.15)",
                        color: "#334155", fontFamily: "inherit"
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = "#60A5FA")}
                      onBlur={e => (e.currentTarget.style.borderColor = "rgba(59,130,246,0.15)")}
                    />
                  ) : (
                    <p style={{ whiteSpace: "pre-line" }}>{s.content}</p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Doctor notes editable */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "#FFFFFF", border: "1px solid rgba(59,130,246,0.09)", boxShadow: "0 1px 8px rgba(59,130,246,0.05)" }}
          >
            <div className="flex items-center gap-3 px-5 py-3" style={{ background: "#FAFCFF", borderBottom: "1px solid rgba(59,130,246,0.07)" }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#EFF6FF" }}>
                <FlaskConical size={14} style={{ color: "#2563EB" }} />
              </div>
              <span className="text-[12px] font-semibold uppercase tracking-[0.05em]" style={{ color: "#5B7394" }}>Doctor Notes</span>
            </div>
            <div className="px-5 py-4">
              <textarea
                className="w-full rounded-xl px-3 py-2 text-[13.5px] outline-none resize-none"
                rows={3}
                defaultValue="BP: 118/78 mmHg. Temperature 37.8°C. Patient appeared mildly distressed. Throat: slightly erythematous. Advised increased oral fluid intake and adequate rest."
                style={{
                  background: "#F8FAFC", border: "1.5px solid rgba(59,130,246,0.15)",
                  color: "#334155", fontFamily: "inherit"
                }}
                onFocus={e => (e.currentTarget.style.borderColor = "#60A5FA")}
                onBlur={e => (e.currentTarget.style.borderColor = "rgba(59,130,246,0.15)")}
              />
            </div>
          </div>
        </div>

        {/* Action sidebar */}
        <div className="flex flex-col gap-3">
          <div
            className="rounded-2xl p-4"
            style={{ background: "#FFFFFF", border: "1px solid rgba(59,130,246,0.09)", boxShadow: "0 1px 8px rgba(59,130,246,0.05)" }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] mb-3" style={{ color: "#94A3B8" }}>Actions</p>
            <div className="flex flex-col gap-[7px]">
              {[
                { icon: Download, label: "Download PDF", style: { background: "linear-gradient(135deg, #2563EB, #6366F1)", color: "white", boxShadow: "0 2px 10px rgba(37,99,235,0.3)" } },
                { icon: Copy, label: "Copy Notes", style: { background: "#F8FAFC", color: "#334155", border: "1.5px solid rgba(59,130,246,0.15)" } },
                { icon: Save, label: "Save Consultation", style: { background: "#F0FDF4", color: "#059669", border: "1.5px solid rgba(5,150,105,0.2)" } },
              ].map((b) => {
                const Icon = b.icon;
                return (
                  <button
                    key={b.label}
                    className="w-full flex items-center gap-[9px] px-3 py-[9px] rounded-xl text-[13px] font-medium transition-all"
                    style={b.style as React.CSSProperties}
                  >
                    <Icon size={14} />{b.label}
                  </button>
                );
              })}
              <div style={{ height: 1, background: "rgba(59,130,246,0.1)", margin: "4px 0" }} />
              <button
                onClick={onNew}
                className="w-full flex items-center gap-[9px] px-3 py-[9px] rounded-xl text-[13px] font-medium"
                style={{ background: "#F8FAFC", color: "#5B7394", border: "1.5px solid rgba(59,130,246,0.15)" }}
              >
                <Plus size={14} />New Consultation
              </button>
            </div>
          </div>

          <div
            className="rounded-2xl p-4"
            style={{ background: "#FFFFFF", border: "1px solid rgba(59,130,246,0.09)", boxShadow: "0 1px 8px rgba(59,130,246,0.05)" }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] mb-3" style={{ color: "#94A3B8" }}>Info</p>
            {[
              { label: "Duration", value: "06:32" },
              { label: "Generated", value: "Today, 10:52 AM" },
              { label: "Model", value: "Whisper + Claude" },
              { label: "Confidence", value: "High ✓", color: "#059669" },
            ].map((row) => (
              <div key={row.label} className="flex justify-between py-[7px]" style={{ borderBottom: "1px solid rgba(59,130,246,0.07)" }}>
                <span className="text-[12px]" style={{ color: "#94A3B8" }}>{row.label}</span>
                <span className="text-[12px] font-medium" style={{ color: row.color ?? "#0F1F3D", fontFamily: row.label === "Duration" ? "JetBrains Mono, monospace" : "inherit" }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <div
            className="rounded-2xl p-4"
            style={{ background: "#FFFFFF", border: "1px solid rgba(59,130,246,0.09)", boxShadow: "0 1px 8px rgba(59,130,246,0.05)" }}
          >
            <details>
              <summary className="text-[12px] font-medium cursor-pointer" style={{ color: "#2563EB" }}>
                View Raw Transcript
              </summary>
              <div
                className="mt-3 text-[11.5px] leading-relaxed overflow-y-auto"
                style={{ maxHeight: 180, color: "#5B7394", fontFamily: "JetBrains Mono, monospace" }}
              >
                <p><strong style={{ color: "#2563EB" }}>Doctor:</strong> Good morning. What brings you in?</p>
                <p className="mt-1"><strong style={{ color: "#059669" }}>Patient:</strong> I&apos;ve had a bad headache for 3 days…</p>
                <p className="mt-1" style={{ color: "#CBD5E1" }}>[Transcript continues…]</p>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
