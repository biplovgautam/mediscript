"use client";
import { useEffect, useState } from "react";
import { Users, Clock, FileCheck, TrendingUp, MoreHorizontal, CalendarIcon } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from "recharts";
import { api, type Patient } from "@/lib/api";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function formatRelTime(iso: string): string {
  const d = new Date(iso);
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7)  return `${diffDays}d ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

type DashData = {
  patientTotal: number;
  sessionTotal: number;
  completedTotal: number;
  activeCount: number;
  thisWeekCount: number;
  maleRatio: number;
  femaleRatio: number;
  weeklyData: { day: string; patients: number; projected: number }[];
  monthlyActivity: { month: string; appointments: number }[];
  recentConsultations: { name: string; id: string; time: string; complaint: string; status: string }[];
};

const statusBadge: Record<string, string> = {
  Complete: "bg-emerald-50 text-emerald-700",
  Pending:  "bg-amber-50 text-amber-700",
};

function StatCard({
  icon, iconBg, iconColor, label, value, trend, trendLabel, meta1, meta2
}: {
  icon: React.ReactNode; iconBg: string; iconColor: string;
  label: string; value: string; trend: string; trendLabel: string;
  meta1: { label: string; val: string }; meta2: { label: string; val: string };
}) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(59,130,246,0.09)",
        boxShadow: "0 2px 16px rgba(59,130,246,0.06), 0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </div>
        <button style={{ color: "#94A3B8" }}>
          <MoreHorizontal size={16} />
        </button>
      </div>
      <div>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[28px] font-bold leading-none" style={{ color: "#0F1F3D", letterSpacing: "-0.5px" }}>
            {value}
          </span>
          <span className="flex items-center gap-[3px] text-[11px] font-semibold" style={{ color: "#059669" }}>
            <TrendingUp size={10} strokeWidth={2.5} />
            {trend}
          </span>
          <span className="text-[11px]" style={{ color: "#94A3B8" }}>{trendLabel}</span>
        </div>
        <p className="text-[13px] font-semibold mt-[6px]" style={{ color: "#5B7394" }}>{label}</p>
      </div>
      <div className="flex gap-4 pt-1" style={{ borderTop: "1px solid rgba(59,130,246,0.07)" }}>
        <span className="text-[12px]" style={{ color: "#5B7394" }}>
          {meta1.label} <strong style={{ color: "#0F1F3D", fontWeight: 600 }}>{meta1.val}</strong>
        </span>
        <span className="text-[12px]" style={{ color: "#5B7394" }}>
          {meta2.label} <strong style={{ color: "#0F1F3D", fontWeight: 600 }}>{meta2.val}</strong>
        </span>
      </div>
    </div>
  );
}

// Custom bar shape — solid + hatched top (matching screenshot)
function CustomBar(props: Record<string, unknown>) {
  const { x, y, width, height, projected, patients } = props as {
    x: number; y: number; width: number; height: number;
    projected: number; patients: number;
  };
  const totalMax = 70;
  const solidH = Math.round((patients / totalMax) * height);
  const hatchH = Math.round((projected / totalMax) * height);
  const totalH = Math.min(solidH + hatchH, height);
  const solidY = y + (height - solidH);
  const hatchY = y + (height - totalH);
  const bw = Math.max(width - 4, 20);
  const bx = x + 2;

  return (
    <g>
      {/* Hatched projected portion */}
      <rect x={bx} y={hatchY} width={bw} height={hatchH} fill="url(#hatch)" opacity={0.6} rx={3} />
      {/* Solid filled portion */}
      <rect x={bx} y={solidY} width={bw} height={solidH} rx={5} ry={5}>
        <animate attributeName="height" from="0" to={String(solidH)} dur="0.5s" fill="freeze" />
      </rect>
      {/* Blue gradient solid */}
      <rect x={bx} y={solidY} width={bw} height={solidH} rx={5} fill="url(#barGrad)" />
    </g>
  );
}

export function DashboardView({ onNewConsult }: { onNewConsult: () => void }) {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [patientsResp, sessionsResp, completedResp] = await Promise.all([
          api.getPatients({ limit: 100 }),
          api.getSessions({ limit: 100 }),
          api.getSessions({ limit: 1, status: "completed" }),
        ]);

        const sessions = sessionsResp.items;
        const patients = patientsResp.items;

        // Gender distribution from patient records
        const maleCount   = patients.filter(p => p.sex?.toLowerCase() === "male").length;
        const femaleCount = patients.filter(p => p.sex?.toLowerCase() === "female").length;
        const genderBase  = patients.length || 1;
        const maleRatio   = Math.round(maleCount   / genderBase * 100);
        const femaleRatio = Math.round(femaleCount  / genderBase * 100);

        // Weekly counts (Sun–Sat) grouped by createdAt day
        const dayCounts = [0, 0, 0, 0, 0, 0, 0];
        sessions.forEach(s => { dayCounts[new Date(s.createdAt).getDay()]++; });
        const weeklyData = DAYS.map((day, i) => ({
          day,
          patients:  dayCounts[i],
          projected: Math.ceil(dayCounts[i] * 1.4),
        }));

        // Monthly session counts for the last 6 calendar months
        const monthCounts = new Array(12).fill(0);
        sessions.forEach(s => { monthCounts[new Date(s.createdAt).getMonth()]++; });
        const curMonth       = new Date().getMonth();
        const monthlyActivity = Array.from({ length: 6 }, (_, i) => {
          const mIdx = (curMonth - 5 + i + 12) % 12;
          return { month: MONTHS[mIdx], appointments: monthCounts[mIdx] };
        });

        // Sessions that started this calendar week (Sunday = week start)
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const thisWeekCount = sessions.filter(s => new Date(s.createdAt) >= startOfWeek).length;

        // Active = currently recording / processing
        const activeStatuses = ["recording", "ready_to_record", "processing"];
        const activeCount = sessions.filter(s => activeStatuses.includes(s.status)).length;

        // 4 most-recent consultations
        const recentConsultations = sessions.slice(0, 4).map(s => {
          const patient = typeof s.patientId === "object" && s.patientId !== null
            ? (s.patientId as Patient)
            : null;
          return {
            name:      patient?.fullName ?? "—",
            id:        String(s._id).slice(-6).toUpperCase(),
            time:      formatRelTime(s.createdAt),
            complaint: s.chiefComplaint ?? "N/A",
            status:    s.status === "completed" ? "Complete" : "Pending",
          };
        });

        setData({
          patientTotal:  patientsResp.pagination.total,
          sessionTotal:  sessionsResp.pagination.total,
          completedTotal: completedResp.pagination.total,
          activeCount,
          thisWeekCount,
          maleRatio,
          femaleRatio,
          weeklyData,
          monthlyActivity,
          recentConsultations,
        });
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm" style={{ color: "#94A3B8" }}>Loading dashboard…</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm" style={{ color: "#94A3B8" }}>Unable to load dashboard data.</div>
      </div>
    );
  }

  const {
    patientTotal, sessionTotal, completedTotal, activeCount,
    thisWeekCount, maleRatio, femaleRatio,
    weeklyData, monthlyActivity, recentConsultations,
  } = data;

  // Arc stroke lengths for the half-donut (half-circle arc = π × r)
  const maleStroke      = Math.round(maleRatio   / 100 * 257.6); // outer arc r=82
  const mixedStroke     = Math.round(((maleRatio + femaleRatio) / 2) / 100 * 219.9); // mid arc r=70
  const femaleStroke    = Math.round(femaleRatio  / 100 * 175.9); // inner arc r=56

  return (
    <div className="flex flex-col gap-5">

      {/* ── 3 Stat Cards ── */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={<Users size={18} strokeWidth={2} />}
          iconBg="#EFF6FF" iconColor="#2563EB"
          label="Total Patients" value={String(patientTotal)}
          trend={`${thisWeekCount}`} trendLabel="sessions this week"
          meta1={{ label: "Sessions:", val: String(sessionTotal) }}
          meta2={{ label: "Completed:", val: String(completedTotal) }}
        />
        <StatCard
          icon={<Clock size={18} strokeWidth={2} />}
          iconBg="#ECFDF5" iconColor="#059669"
          label="Total Sessions" value={String(sessionTotal)}
          trend={`${thisWeekCount}`} trendLabel="this week"
          meta1={{ label: "Active:", val: String(activeCount) }}
          meta2={{ label: "Completed:", val: String(completedTotal) }}
        />
        <StatCard
          icon={<FileCheck size={18} strokeWidth={2} />}
          iconBg="#F5F3FF" iconColor="#7C3AED"
          label="Completed Notes" value={String(completedTotal)}
          trend={`${Math.max(0, completedTotal - activeCount)}`} trendLabel="finalized"
          meta1={{ label: "Active:", val: String(activeCount) }}
          meta2={{ label: "Pending:", val: String(Math.max(0, sessionTotal - completedTotal)) }}
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 300px" }}>

        {/* Sessions per day-of-week bar chart */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: "#FFFFFF",
            border: "1px solid rgba(59,130,246,0.09)",
            boxShadow: "0 2px 16px rgba(59,130,246,0.06)",
          }}
        >
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="text-[15px] font-bold" style={{ color: "#0F1F3D" }}>Analytics</h3>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-[24px] font-bold" style={{ color: "#0F1F3D", letterSpacing: "-0.5px" }}>
                  {thisWeekCount}
                </span>
                <span className="text-[11px] font-semibold" style={{ color: "#059669" }}>sessions</span>
                <span className="text-[11px]" style={{ color: "#94A3B8" }}>this week</span>
              </div>
            </div>
            <button
              onClick={onNewConsult}
              className="flex items-center gap-[6px] text-[12px] rounded-full px-3 py-[5px] transition-colors"
              style={{
                background: "#F0F5FB", color: "#5B7394",
                border: "1px solid rgba(59,130,246,0.12)",
              }}
            >
              <CalendarIcon size={12} />
              New
            </button>
          </div>

          <div style={{ height: 170 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} barCategoryGap="25%" barGap={2}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60A5FA" />
                    <stop offset="100%" stopColor="#2563EB" />
                  </linearGradient>
                  <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
                    <line x1="0" y1="0" x2="0" y2="6" stroke="#93C5FD" strokeWidth="2" opacity="0.5" />
                  </pattern>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(59,130,246,0.08)" />
                <XAxis
                  dataKey="day"
                  axisLine={false} tickLine={false}
                  tick={{ fontSize: 11, fill: "#94A3B8", fontFamily: "Plus Jakarta Sans" }}
                />
                <YAxis
                  axisLine={false} tickLine={false}
                  tick={{ fontSize: 10, fill: "#94A3B8", fontFamily: "Plus Jakarta Sans" }}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0D1526", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10, fontSize: 12, color: "white",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.3)"
                  }}
                  cursor={{ fill: "rgba(59,130,246,0.04)" }}
                />
                <Bar dataKey="projected" fill="url(#hatch)" radius={[4,4,0,0]} opacity={0.5} />
                <Bar dataKey="patients"  fill="url(#barGrad)" radius={[5,5,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gender donut card — derived from real patient sex field */}
        <div
          className="rounded-2xl p-5 flex flex-col"
          style={{
            background: "#FFFFFF",
            border: "1px solid rgba(59,130,246,0.09)",
            boxShadow: "0 2px 16px rgba(59,130,246,0.06)",
          }}
        >
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="text-[15px] font-bold" style={{ color: "#0F1F3D" }}>Gender</h3>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-[22px] font-bold" style={{ color: "#0F1F3D" }}>{patientTotal}</span>
                <span className="text-[13px]" style={{ color: "#94A3B8" }}> Patients</span>
              </div>
            </div>
            <button
              className="flex items-center gap-[6px] text-[12px] rounded-full px-3 py-[5px]"
              style={{
                background: "#F0F5FB", color: "#5B7394",
                border: "1px solid rgba(59,130,246,0.12)",
              }}
            >
              <CalendarIcon size={12} />
              Monthly
            </button>
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-[6px]">
              <div className="w-2 h-2 rounded-full" style={{ background: "#2563EB" }} />
              <span className="text-[12px]" style={{ color: "#5B7394" }}>Male</span>
              <span className="text-[12px] font-semibold" style={{ color: "#0F1F3D" }}>{maleRatio}%</span>
            </div>
            <div className="flex items-center gap-[6px]">
              <div className="w-2 h-2 rounded-full" style={{ background: "#7DD3FC" }} />
              <span className="text-[12px]" style={{ color: "#5B7394" }}>Female</span>
              <span className="text-[12px] font-semibold" style={{ color: "#0F1F3D" }}>{femaleRatio}%</span>
            </div>
          </div>

          {/* SVG half-donut with real ratios */}
          <div className="flex-1 flex items-center justify-center">
            <div className="relative" style={{ width: 200, height: 110 }}>
              <svg viewBox="0 0 200 110" width="200" height="110">
                <path d="M 18 100 A 82 82 0 0 1 182 100" fill="none" stroke="#EFF6FF" strokeWidth="18" strokeLinecap="round" />
                <path d="M 18 100 A 82 82 0 0 1 182 100" fill="none" stroke="#2563EB" strokeWidth="18" strokeLinecap="round"
                  strokeDasharray={`${maleStroke} 600`} strokeDashoffset="0" />
                <path d="M 30 100 A 70 70 0 0 1 170 100" fill="none" stroke="#EFF6FF" strokeWidth="16" strokeLinecap="round" />
                <path d="M 30 100 A 70 70 0 0 1 170 100" fill="none" stroke="#60A5FA" strokeWidth="16" strokeLinecap="round"
                  strokeDasharray={`${mixedStroke} 600`} strokeDashoffset="0" />
                <path d="M 44 100 A 56 56 0 0 1 156 100" fill="none" stroke="#EFF6FF" strokeWidth="14" strokeLinecap="round" />
                <path d="M 44 100 A 56 56 0 0 1 156 100" fill="none" stroke="#93C5FD" strokeWidth="14" strokeLinecap="round"
                  strokeDasharray={`${femaleStroke} 600`} strokeDashoffset="0" />
                <text x="100" y="86" textAnchor="middle" fontSize="10" fill="#94A3B8"
                  fontFamily="Plus Jakarta Sans, sans-serif">Total Patients</text>
                <text x="100" y="103" textAnchor="middle" fontSize="16" fontWeight="700" fill="#0F1F3D"
                  fontFamily="Plus Jakarta Sans, sans-serif">{patientTotal}</text>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom row: Activity + Table ── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Monthly sessions line chart */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: "#FFFFFF",
            border: "1px solid rgba(59,130,246,0.09)",
            boxShadow: "0 2px 16px rgba(59,130,246,0.06)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-bold" style={{ color: "#0F1F3D" }}>Monthly Activity</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-[5px]">
                <div className="w-[7px] h-[7px] rounded-full bg-blue-500" />
                <span className="text-[11px]" style={{ color: "#94A3B8" }}>Sessions</span>
              </div>
            </div>
          </div>
          <div style={{ height: 110 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyActivity}>
                <CartesianGrid stroke="rgba(59,130,246,0.07)" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94A3B8" }} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "#0D1526", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10, fontSize: 12, color: "white",
                  }}
                  cursor={{ stroke: "rgba(59,130,246,0.1)" }}
                />
                <Line type="monotone" dataKey="appointments" name="Sessions" stroke="#2563EB" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent consultations mini-table */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "#FFFFFF",
            border: "1px solid rgba(59,130,246,0.09)",
            boxShadow: "0 2px 16px rgba(59,130,246,0.06)",
          }}
        >
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(59,130,246,0.07)" }}>
            <h3 className="text-[14px] font-bold" style={{ color: "#0F1F3D" }}>Recent Consultations</h3>
            <button className="text-[12px] font-medium" style={{ color: "#2563EB" }}>View all →</button>
          </div>
          <div>
            {recentConsultations.length === 0 ? (
              <p className="text-center text-[13px] py-8" style={{ color: "#94A3B8" }}>No consultations yet.</p>
            ) : recentConsultations.map((c, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors"
                style={{
                  borderBottom: i < recentConsultations.length - 1 ? "1px solid rgba(59,130,246,0.06)" : "none",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFF")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
                  style={{ background: "#EFF6FF", color: "#2563EB" }}
                >
                  {c.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate" style={{ color: "#0F1F3D" }}>{c.name}</p>
                  <p className="text-[11px]" style={{ color: "#94A3B8" }}>{c.time}</p>
                </div>
                <span className="text-[11px] font-semibold px-[8px] py-[3px] rounded-full bg-blue-50 text-blue-700 truncate max-w-[90px]">
                  {c.complaint}
                </span>
                <span className={`text-[11px] font-semibold px-[8px] py-[3px] rounded-full ${statusBadge[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
