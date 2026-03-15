"use client";
import {
  LayoutDashboard, Mic, Clock, Users, FileText, Settings,
  Activity, ChevronRight, LogOut
} from "lucide-react";
import type { AuthUser } from "@/lib/api";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, section: "main" },
  { id: "consultation", label: "New Consultation", icon: Mic, section: "main" },
  { id: "history", label: "History", icon: Clock, section: "main", badge: "24" },
  { id: "patients", label: "Patients", icon: Users, section: "main" },
  { id: "notes", label: "Medical Notes", icon: FileText, section: "reports" },
  { id: "settings", label: "Settings", icon: Settings, section: "account" },
];

interface SidebarProps {
  active: string;
  onNav: (id: string) => void;
  user: AuthUser | null;
  onLogout: () => void;
}

export function Sidebar({ active, onNav, user, onLogout }: SidebarProps) {
  return (
    <aside
      className="flex flex-col w-[228px] flex-shrink-0 h-screen relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #0B1120 0%, #0D1526 60%, #0B1A2E 100%)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "4px 0 32px rgba(0,0,0,0.25)",
      }}
    >
      {/* Ambient glow blobs */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 200, height: 200, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)",
          top: -60, left: -60,
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: 180, height: 180, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)",
          bottom: 80, right: -50,
        }}
      />

      {/* Logo */}
      <div
        className="flex items-center gap-3 px-5 py-[18px] relative z-10"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div
          className="flex items-center justify-center w-8 h-8 rounded-[9px] flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)",
            boxShadow: "0 0 14px rgba(99,102,241,0.5)",
          }}
        >
          <Activity size={16} color="white" strokeWidth={2.5} />
        </div>
        <span className="text-white font-semibold text-[15px] tracking-[-0.3px]">
          Medi<span style={{ color: "#818CF8" }}>Script</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 relative z-10">
        {["main", "reports", "account"].map((section) => {
          const items = navItems.filter((n) => n.section === section);
          const label = section === "main" ? "Main" : section === "reports" ? "Reports" : "Account";
          return (
            <div key={section} className="mb-1">
              <p
                className="px-3 text-[10px] font-semibold uppercase tracking-[0.1em] mb-1 mt-3"
                style={{ color: "rgba(107,114,128,0.8)" }}
              >
                {label}
              </p>
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNav(item.id)}
                    className="w-full flex items-center gap-[10px] px-3 py-[9px] rounded-[9px] text-left transition-all duration-150 mb-[2px] group"
                    style={{
                      background: isActive ? "rgba(59,130,246,0.14)" : "transparent",
                      border: isActive ? "1px solid rgba(59,130,246,0.45)" : "1px solid transparent",
                      boxShadow: isActive ? "0 0 14px rgba(59,130,246,0.12)" : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                      }
                    }}
                  >
                    <Icon
                      size={15}
                      style={{ color: isActive ? "#60A5FA" : "rgba(148,163,184,0.7)", flexShrink: 0 }}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    <span
                      className="text-[13.5px] flex-1"
                      style={{
                        color: isActive ? "white" : "rgba(148,163,184,0.85)",
                        fontWeight: isActive ? 500 : 400,
                      }}
                    >
                      {item.label}
                    </span>
                    {item.badge && (
                      <span
                        className="text-[10px] font-semibold px-[7px] py-[2px] rounded-full"
                        style={{
                          background: "rgba(99,102,241,0.2)",
                          color: "#A5B4FC",
                          border: "1px solid rgba(99,102,241,0.3)",
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <ChevronRight size={12} style={{ color: "#60A5FA", opacity: 0.6 }} />
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="px-4 py-4 flex items-center gap-3 relative z-10"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div
          className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[12px] font-semibold text-white flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
            boxShadow: "0 0 10px rgba(99,102,241,0.4)",
          }}
        >
          {user?.fullName
            ? user.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
            : "?"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-[13px] font-medium truncate">{user?.fullName ?? "—"}</p>
          <p className="text-[11px] truncate" style={{ color: "rgba(107,114,128,1)" }}>
            {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ""}
          </p>
        </div>
        <button
          onClick={onLogout}
          title="Sign out"
          className="opacity-40 hover:opacity-70 transition-opacity"
          style={{ color: "rgba(148,163,184,1)" }}
        >
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  );
}
