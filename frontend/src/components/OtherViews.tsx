"use client";
import { useEffect, useMemo, useState } from "react";
import { Filter, Search } from "lucide-react";
import { api, type Patient, type Session } from "@/lib/api";

const formatDate = (value: string) => {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleString();
};

export function HistoryView() {
  const [items, setItems] = useState<Session[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
                  <tr key={session._id} style={{ borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
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
