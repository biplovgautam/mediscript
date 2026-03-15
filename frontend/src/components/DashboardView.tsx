"use client";
import { Users, Building2, CalendarDays, TrendingUp, MoreHorizontal, CalendarIcon } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from "recharts";

const weeklyData = [
  { day: "Sun", patients: 32, projected: 42 },
  { day: "Mon", patients: 40, projected: 52 },
  { day: "Tue", patients: 38, projected: 58 },
  { day: "Wed", patients: 52, projected: 65 },
  { day: "Thu", patients: 44, projected: 55 },
  { day: "Fri", patients: 48, projected: 60 },
  { day: "Sat", patients: 28, projected: 40 },
];

const monthlyActivity = [
  { month: "Jan", appointments: 38, meetings: 20 },
  { month: "Feb", appointments: 52, meetings: 28 },
  { month: "Mar", appointments: 44, meetings: 22 },
  { month: "Apr", appointments: 60, meetings: 35 },
  { month: "May", appointments: 48, meetings: 30 },
  { month: "Jun", appointments: 55, meetings: 25 },
];

const recentConsultations = [
  { name: "Ram Bahadur Thapa", id: "OPD-042", time: "10:45 AM", diagnosis: "Viral fever", status: "Complete" },
  { name: "Sunita Karki", id: "OPD-041", time: "09:18 AM", diagnosis: "Hypertension", status: "Complete" },
  { name: "Bikash Tamang", id: "OPD-040", time: "Yesterday", diagnosis: "Dengue", status: "Pending" },
  { name: "Asha Gurung", id: "OPD-039", time: "Yesterday", diagnosis: "UTI", status: "Complete" },
];

const diagnosisBadge: Record<string, string> = {
  "Viral fever": "bg-amber-50 text-amber-700",
  "Hypertension": "bg-blue-50 text-blue-700",
  "Dengue": "bg-red-50 text-red-600",
  "UTI": "bg-purple-50 text-purple-700",
};
const statusBadge: Record<string, string> = {
  Complete: "bg-emerald-50 text-emerald-700",
  Pending: "bg-amber-50 text-amber-700",
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
  return (
    <div className="flex flex-col gap-5">

      {/* ── 3 Stat Cards ── */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={<Users size={18} strokeWidth={2} />}
          iconBg="#EFF6FF" iconColor="#2563EB"
          label="Total Patient" value="102"
          trend="12.8%" trendLabel="the last month"
          meta1={{ label: "New patient", val: "48" }}
          meta2={{ label: "Old patient", val: "54" }}
        />
        <StatCard
          icon={<Building2 size={18} strokeWidth={2} />}
          iconBg="#ECFDF5" iconColor="#059669"
          label="Overall Room" value="128"
          trend="0.8%" trendLabel="the last month"
          meta1={{ label: "General Room", val: "98" }}
          meta2={{ label: "Private Room", val: "30" }}
        />
        <StatCard
          icon={<CalendarDays size={18} strokeWidth={2} />}
          iconBg="#F5F3FF" iconColor="#7C3AED"
          label="Appointment" value="254"
          trend="1.9%" trendLabel="the last month"
          meta1={{ label: "New patient", val: "56" }}
          meta2={{ label: "Old patient", val: "43" }}
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 300px" }}>

        {/* Bar chart */}
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
                <span className="text-[24px] font-bold" style={{ color: "#0F1F3D", letterSpacing: "-0.5px" }}>48</span>
                <span className="text-[11px] font-semibold" style={{ color: "#059669" }}>↑ 0.8%</span>
                <span className="text-[11px]" style={{ color: "#94A3B8" }}>vs previous month</span>
              </div>
            </div>
            <button
              className="flex items-center gap-[6px] text-[12px] rounded-full px-3 py-[5px] transition-colors"
              style={{
                background: "#F0F5FB", color: "#5B7394",
                border: "1px solid rgba(59,130,246,0.12)",
              }}
            >
              <CalendarIcon size={12} />
              Monthly
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
                  ticks={[0, 25, 45, 65]}
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
                <Bar dataKey="patients" fill="url(#barGrad)" radius={[5,5,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gender donut-style card */}
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
                <span className="text-[22px] font-bold" style={{ color: "#0F1F3D" }}>102</span>
                <span className="text-[13px]" style={{ color: "#94A3B8" }}> Patient</span>
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
              <span className="text-[12px]" style={{ color: "#5B7394" }}>Man</span>
              <span className="text-[12px] font-semibold" style={{ color: "#0F1F3D" }}>35%</span>
            </div>
            <div className="flex items-center gap-[6px]">
              <div className="w-2 h-2 rounded-full" style={{ background: "#7DD3FC" }} />
              <span className="text-[12px]" style={{ color: "#5B7394" }}>Woman</span>
              <span className="text-[12px] font-semibold" style={{ color: "#0F1F3D" }}>15%</span>
            </div>
          </div>

          {/* SVG half-donut */}
          <div className="flex-1 flex items-center justify-center">
            <div className="relative" style={{ width: 200, height: 110 }}>
              <svg viewBox="0 0 200 110" width="200" height="110">
                {/* Outer arc bg */}
                <path d="M 18 100 A 82 82 0 0 1 182 100" fill="none" stroke="#EFF6FF" strokeWidth="18" strokeLinecap="round" />
                {/* Outer arc filled — man (35%) */}
                <path d="M 18 100 A 82 82 0 0 1 182 100" fill="none" stroke="#2563EB" strokeWidth="18" strokeLinecap="round"
                  strokeDasharray="179 512" strokeDashoffset="0" />
                {/* Mid arc bg */}
                <path d="M 30 100 A 70 70 0 0 1 170 100" fill="none" stroke="#EFF6FF" strokeWidth="16" strokeLinecap="round" />
                {/* Mid arc — mixed */}
                <path d="M 30 100 A 70 70 0 0 1 170 100" fill="none" stroke="#60A5FA" strokeWidth="16" strokeLinecap="round"
                  strokeDasharray="154 440" strokeDashoffset="0" />
                {/* Inner arc bg */}
                <path d="M 44 100 A 56 56 0 0 1 156 100" fill="none" stroke="#EFF6FF" strokeWidth="14" strokeLinecap="round" />
                {/* Inner arc — woman (15%) */}
                <path d="M 44 100 A 56 56 0 0 1 156 100" fill="none" stroke="#93C5FD" strokeWidth="14" strokeLinecap="round"
                  strokeDasharray="120 352" strokeDashoffset="0" />
                {/* Center text */}
                <text x="100" y="86" textAnchor="middle" fontSize="10" fill="#94A3B8"
                  fontFamily="Plus Jakarta Sans, sans-serif">Total Patient</text>
                <text x="100" y="103" textAnchor="middle" fontSize="16" fontWeight="700" fill="#0F1F3D"
                  fontFamily="Plus Jakarta Sans, sans-serif">1000+</text>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom row: Activity + Table ── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Monthly Activity line chart */}
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
                <span className="text-[11px]" style={{ color: "#94A3B8" }}>Appointment</span>
              </div>
              <div className="flex items-center gap-[5px]">
                <div className="w-[7px] h-[7px] rounded-full bg-rose-400" />
                <span className="text-[11px]" style={{ color: "#94A3B8" }}>Meeting</span>
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
                <Line type="monotone" dataKey="appointments" stroke="#2563EB" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="meetings" stroke="#F43F5E" strokeWidth={2} dot={false} strokeDasharray="4 3" />
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
            {recentConsultations.map((c, i) => (
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
                  {c.name.split(" ").map(n => n[0]).join("").slice(0,2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate" style={{ color: "#0F1F3D" }}>{c.name}</p>
                  <p className="text-[11px]" style={{ color: "#94A3B8" }}>{c.time}</p>
                </div>
                <span className={`text-[11px] font-semibold px-[8px] py-[3px] rounded-full ${diagnosisBadge[c.diagnosis] ?? "bg-gray-100 text-gray-600"}`}>
                  {c.diagnosis}
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
