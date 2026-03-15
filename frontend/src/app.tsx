import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { DashboardView } from "@/components/DashboardView";
import { ConsultationView } from "@/components/ConsultationView";
import { SummaryView } from "@/components/SummaryView";
import { HistoryView, PatientView, SettingsView } from "@/components/OtherViews";
import { Bell, Search, MessageSquare } from "lucide-react";

const GREET = (() => {
  const h = new Date().getHours();
  return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";
})();

const topbarMeta: Record<string, { title: string; sub: string }> = {
  dashboard:    { title: `${GREET}, Dr. Sharma 👋`,   sub: "Your progress this week is Awesome." },
  consultation: { title: "New Consultation",           sub: "Record and document a patient visit" },
  history:      { title: "Consultation History",       sub: "View and search all past consultations" },
  patients:     { title: "Patients",                   sub: "Manage patient profiles and records" },
  notes:        { title: "Medical Notes",              sub: "View generated AI consultation summaries" },
  settings:     { title: "Settings",                   sub: "Manage your profile and preferences" },
};

export default function App() {
  const [view, setView] = useState("dashboard");
  const meta = topbarMeta[view] ?? topbarMeta.dashboard;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#F0F5FB", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Sidebar active={view} onNav={setView} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ── Topbar ── */}
        <header
          className="flex items-center gap-4 px-7 flex-shrink-0"
          style={{
            height: 64,
            background: "rgba(255,255,255,0.75)",
            backdropFilter: "blur(14px)",
            borderBottom: "1px solid rgba(59,130,246,0.09)",
          }}
        >
          <div className="flex-1 min-w-0">
            <h1
              className="text-[15px] font-bold leading-tight truncate"
              style={{ color: "#0F1F3D", letterSpacing: "-0.2px" }}
            >
              {meta.title}
            </h1>
            <p className="text-[12px] truncate" style={{ color: "#94A3B8" }}>
              {meta.sub}
            </p>
          </div>

          {/* Search pill */}
          <div
            className="flex items-center gap-2 px-4 rounded-full"
            style={{
              background: "white",
              border: "1px solid rgba(59,130,246,0.14)",
              height: 36,
              width: 210,
            }}
          >
            <Search size={14} style={{ color: "#94A3B8", flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search..."
              className="outline-none bg-transparent text-[13px] w-full"
              style={{ color: "#0F1F3D" }}
            />
          </div>

          {/* Icon buttons */}
          {[Bell, MessageSquare].map((Icon, i) => (
            <button
              key={i}
              className="relative w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-blue-50"
              style={{ background: "white", border: "1px solid rgba(59,130,246,0.12)" }}
            >
              {i === 0 && (
                <span
                  className="absolute top-[8px] right-[8px] w-[7px] h-[7px] rounded-full"
                  style={{ background: "#EF4444", border: "1.5px solid white" }}
                />
              )}
              <Icon size={15} style={{ color: "#5B7394" }} />
            </button>
          ))}

          {/* Avatar */}
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white cursor-pointer flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #2563EB, #6366F1)",
              border: "2px solid white",
              boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
            }}
          >
            DS
          </div>
        </header>

        {/* ── Content ── */}
        <main className="flex-1 overflow-y-auto p-6">
          {view === "dashboard"    && <DashboardView onNewConsult={() => setView("consultation")} />}
          {view === "consultation" && <ConsultationView onComplete={() => setView("notes")} />}
          {view === "notes"        && <SummaryView onNew={() => setView("consultation")} />}
          {view === "history"      && <HistoryView />}
          {view === "patients"     && <PatientView />}
          {view === "settings"     && <SettingsView />}
        </main>
      </div>
    </div>
  );
}
