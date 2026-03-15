"use client";
import { Search, Filter } from "lucide-react";

const consultations = [
  { name: "Ram Bahadur Thapa", id: "OPD-2024-042", date: "Today, 10:45 AM", diagnosis: "Viral fever", duration: "06:32", status: "Complete" },
  { name: "Sunita Karki", id: "OPD-2024-041", date: "Today, 09:18 AM", diagnosis: "Hypertension", duration: "08:14", status: "Complete" },
  { name: "Bikash Tamang", id: "OPD-2024-040", date: "Mar 14, 3:22 PM", diagnosis: "Dengue (suspected)", duration: "11:02", status: "Complete" },
  { name: "Asha Gurung", id: "OPD-2024-039", date: "Mar 14, 11:05 AM", diagnosis: "UTI", duration: "05:48", status: "Complete" },
  { name: "Prakash Rai", id: "OPD-2024-038", date: "Mar 13, 2:10 PM", diagnosis: "Follow-up", duration: "04:22", status: "Complete" },
  { name: "Meena Shrestha", id: "OPD-2024-037", date: "Mar 13, 10:30 AM", diagnosis: "Diabetes check", duration: "09:11", status: "Complete" },
];

const dxColor: Record<string, string> = {
  "Viral fever": "bg-amber-50 text-amber-700",
  "Hypertension": "bg-blue-50 text-blue-700",
  "Dengue (suspected)": "bg-red-50 text-red-600",
  "UTI": "bg-purple-50 text-purple-700",
  "Follow-up": "bg-gray-100 text-gray-600",
  "Diabetes check": "bg-emerald-50 text-emerald-700",
};

export function HistoryView() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#94A3B8" }} />
          <input
            type="text" placeholder="Search patients, diagnoses…"
            className="w-full rounded-xl pl-9 pr-4 py-[9px] text-[13.5px] outline-none"
            style={{ background: "#FFFFFF", border: "1.5px solid rgba(59,130,246,0.15)", color: "#0F1F3D" }}
          />
        </div>
        {["All dates", "All diagnoses"].map((opt) => (
          <select key={opt}
            className="rounded-xl px-3 py-[9px] text-[13px] outline-none"
            style={{ background: "#FFFFFF", border: "1.5px solid rgba(59,130,246,0.15)", color: "#5B7394", minWidth: 130 }}
          >
            <option>{opt}</option>
          </select>
        ))}
        <button
          className="flex items-center gap-2 px-4 py-[9px] rounded-xl text-[13px]"
          style={{ background: "#FFFFFF", border: "1.5px solid rgba(59,130,246,0.15)", color: "#5B7394" }}
        >
          <Filter size={14} /> Filter
        </button>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid rgba(59,130,246,0.09)", boxShadow: "0 2px 16px rgba(59,130,246,0.06)" }}>
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(240,245,251,0.8)", borderBottom: "1px solid rgba(59,130,246,0.09)" }}>
              {["Patient", "Date & Time", "Diagnosis", "Duration", "Status", ""].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.05em]" style={{ color: "#5B7394" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {consultations.map((c, i) => (
              <tr
                key={i}
                className="cursor-pointer transition-colors"
                style={{ borderBottom: i < consultations.length - 1 ? "1px solid rgba(59,130,246,0.06)" : "none" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFF")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <td className="px-5 py-[13px]">
                  <div className="text-[13.5px] font-semibold" style={{ color: "#0F1F3D" }}>{c.name}</div>
                  <div className="text-[11px]" style={{ color: "#94A3B8", fontFamily: "JetBrains Mono" }}>{c.id}</div>
                </td>
                <td className="px-5 py-[13px] text-[13px]" style={{ color: "#5B7394" }}>{c.date}</td>
                <td className="px-5 py-[13px]">
                  <span className={`text-[11.5px] font-semibold px-3 py-[3px] rounded-full ${dxColor[c.diagnosis] ?? "bg-gray-100 text-gray-600"}`}>{c.diagnosis}</span>
                </td>
                <td className="px-5 py-[13px] text-[13px]" style={{ color: "#5B7394", fontFamily: "JetBrains Mono" }}>{c.duration}</td>
                <td className="px-5 py-[13px]">
                  <span className="text-[11.5px] font-semibold px-3 py-[3px] rounded-full bg-emerald-50 text-emerald-700">{c.status}</span>
                </td>
                <td className="px-5 py-[13px]">
                  <button className="text-[12px] font-medium" style={{ color: "#2563EB" }}>View →</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PatientView() {
  const visits = [
    { date: "Today · 10:45 AM · 06:32", title: "Viral fever — OPD-2024-042", body: "Persistent headache, fever 37.8°C, fatigue. Paracetamol + ORS. Follow-up in 3 days." },
    { date: "Feb 18 · 11:20 AM · 05:14", title: "Acute tonsillitis — OPD-2024-018", body: "Sore throat, difficulty swallowing, low-grade fever. Prescribed Amoxicillin." },
    { date: "Jan 05 · 09:45 AM · 04:52", title: "Gastroenteritis — OPD-2024-003", body: "Stomach cramps, loose motions × 3 days. ORS, Zinc, dietary advice." },
  ];
  return (
    <div className="grid gap-5" style={{ gridTemplateColumns: "290px 1fr" }}>
      {/* Profile card */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid rgba(59,130,246,0.09)", boxShadow: "0 2px 16px rgba(59,130,246,0.06)" }}>
        <div className="p-6 text-center" style={{ background: "linear-gradient(135deg, #1D4ED8, #4F46E5)" }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-3" style={{ background: "rgba(255,255,255,0.2)", border: "3px solid rgba(255,255,255,0.35)" }}>RT</div>
          <p className="text-white font-bold text-[17px]">Ram Bahadur Thapa</p>
          <p className="text-[12px] mt-1" style={{ color: "rgba(255,255,255,0.65)" }}>OPD-2024-042</p>
        </div>
        <div className="p-5">
          {[
            { l: "Age", v: "32 years" }, { l: "Phone", v: "+977 98412-XXXXX" },
            { l: "Address", v: "Lalitpur, Kathmandu" }, { l: "Blood group", v: "B+" },
            { l: "Total visits", v: "4 consultations" }, { l: "Last visit", v: "Today" },
          ].map(({ l, v }) => (
            <div key={l} className="flex justify-between py-[8px]" style={{ borderBottom: "1px solid rgba(59,130,246,0.07)" }}>
              <span className="text-[12px]" style={{ color: "#94A3B8" }}>{l}</span>
              <span className="text-[13px] font-medium" style={{ color: "#0F1F3D" }}>{v}</span>
            </div>
          ))}
          <button
            className="w-full mt-4 py-[10px] rounded-xl text-[13px] font-semibold"
            style={{ background: "linear-gradient(135deg, #2563EB, #6366F1)", color: "white", boxShadow: "0 2px 10px rgba(37,99,235,0.3)" }}
          >
            Start New Consultation
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div>
        <h2 className="text-[15px] font-bold mb-5" style={{ color: "#0F1F3D" }}>Consultation Timeline</h2>
        <div className="flex flex-col">
          {visits.map((v, i) => (
            <div key={i} className="flex gap-4 pb-6 relative">
              {i < visits.length - 1 && (
                <div className="absolute left-[11px] top-6 bottom-0 w-[1px]" style={{ background: "rgba(59,130,246,0.15)" }} />
              )}
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-[2px]"
                style={{ background: "#EFF6FF", border: "2px solid rgba(59,130,246,0.25)" }}
              >
                <div className="w-2 h-2 rounded-full" style={{ background: "#2563EB" }} />
              </div>
              <div className="flex-1">
                <p className="text-[11px] mb-1" style={{ color: "#94A3B8" }}>{v.date}</p>
                <p className="text-[13.5px] font-semibold mb-1" style={{ color: "#0F1F3D" }}>{v.title}</p>
                <p className="text-[13px] leading-relaxed" style={{ color: "#5B7394" }}>{v.body}</p>
                <button className="text-[12px] font-medium mt-2" style={{ color: "#2563EB" }}>View note →</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SettingsView() {
  const toggles = [
    { label: "Auto-generate summary", desc: "Generate notes automatically when recording stops", on: true },
    { label: "Live transcription", desc: "Show real-time text during consultation", on: true },
    { label: "Diagnosis suggestions", desc: "Show AI-suggested differential diagnoses", on: true },
    { label: "Prescription suggestions", desc: "Allow AI to suggest medications", on: false },
  ];

  return (
    <div className="grid gap-5" style={{ gridTemplateColumns: "200px 1fr" }}>
      <div className="flex flex-col gap-1">
        {["Doctor Profile", "AI Settings", "Export Settings", "Privacy & Security"].map((item, i) => (
          <button
            key={item}
            className="w-full text-left px-3 py-[9px] rounded-xl text-[13.5px] transition-all"
            style={{
              background: i === 0 ? "#EFF6FF" : "transparent",
              color: i === 0 ? "#2563EB" : "#5B7394",
              fontWeight: i === 0 ? 500 : 400,
            }}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {/* Profile section */}
        <div className="rounded-2xl p-6" style={{ background: "#FFFFFF", border: "1px solid rgba(59,130,246,0.09)", boxShadow: "0 2px 12px rgba(59,130,246,0.05)" }}>
          <h3 className="text-[15px] font-bold mb-1" style={{ color: "#0F1F3D" }}>Doctor Profile</h3>
          <p className="text-[13px] mb-5" style={{ color: "#94A3B8" }}>Your information appears on all generated notes and PDF exports.</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {[{ l: "Full Name", v: "Dr. Dipa Sharma" }, { l: "Specialization", v: "General Physician" }].map(({ l, v }) => (
              <div key={l}>
                <label className="block text-[12px] font-medium mb-1" style={{ color: "#5B7394" }}>{l}</label>
                <input type="text" defaultValue={v} className="w-full rounded-xl px-3 py-[9px] text-[13.5px] outline-none"
                  style={{ background: "#F8FAFC", border: "1.5px solid rgba(59,130,246,0.15)", color: "#0F1F3D" }} />
              </div>
            ))}
          </div>
          <div className="mb-4">
            <label className="block text-[12px] font-medium mb-1" style={{ color: "#5B7394" }}>Hospital / Clinic</label>
            <input type="text" defaultValue="Kathmandu Community Health Clinic" className="w-full rounded-xl px-3 py-[9px] text-[13.5px] outline-none"
              style={{ background: "#F8FAFC", border: "1.5px solid rgba(59,130,246,0.15)", color: "#0F1F3D" }} />
          </div>
          <button className="px-4 py-[9px] rounded-xl text-[13px] font-semibold"
            style={{ background: "linear-gradient(135deg, #2563EB, #6366F1)", color: "white", boxShadow: "0 2px 10px rgba(37,99,235,0.3)" }}>
            Save Changes
          </button>
        </div>

        {/* AI settings */}
        <div className="rounded-2xl p-6" style={{ background: "#FFFFFF", border: "1px solid rgba(59,130,246,0.09)", boxShadow: "0 2px 12px rgba(59,130,246,0.05)" }}>
          <h3 className="text-[15px] font-bold mb-1" style={{ color: "#0F1F3D" }}>AI Settings</h3>
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
      </div>
    </div>
  );
}
