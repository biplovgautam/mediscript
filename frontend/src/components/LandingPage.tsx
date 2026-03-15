import React, { useState, useEffect, useRef } from "react";
import {
  Mic, FileText, Zap, Shield, ChevronRight, ArrowRight,
  Activity, Check, Star, Play, Users, Clock,
  Stethoscope, HeartPulse, ClipboardList, Bell, Search,
  Pill, ChevronDown
} from "lucide-react";


function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─────────────────────────────────────────────────────
// Nav
// ─────────────────────────────────────────────────────
function Nav({ onEnterApp }: { onEnterApp: () => void }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(255,255,255,0.95)" : "rgba(248,250,252,0.92)",
        backdropFilter: scrolled ? "blur(18px)" : "none",
        borderBottom: "1px solid rgba(15,23,42,0.08)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo */}
          <div className="flex items-center gap-[10px]">
            <div
              className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #3B82F6, #6366F1)",
                boxShadow: "0 0 18px rgba(99,102,241,0.55)",
              }}
            >
              <Activity size={16} color="white" strokeWidth={2.5} />
            </div>
            <span
              className="text-[17px] font-bold tracking-[-0.4px]"
              style={{ color: "#0F172A", fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              Medi<span style={{ color: "#818CF8" }}>Script</span>
            </span>
          </div>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <button
              onClick={onEnterApp}
              className="flex items-center gap-2 text-[13.5px] font-semibold px-5 py-[9px] rounded-xl transition-all duration-150 hover:scale-[1.02]"
              style={{
                background: "linear-gradient(135deg, #2563EB, #4F46E5)",
                color: "white",
                boxShadow: "0 2px 12px rgba(37,99,235,0.4)",
              }}
            >
              Get Started <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────
// Hero product mockup
// ─────────────────────────────────────────────────────
function HeroMockup() {
  const [step, setStep] = useState(0);
  const [typedId, setTypedId] = useState("");
  const [recording, setRecording] = useState(false);
  const [recTimer, setRecTimer] = useState(0);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [showRx, setShowRx] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const patientId = "OPD-2024-042";
  const lines = [
    "Doctor: What brings you in today?",
    "Patient: I've had a headache for 3 days and feel feverish.",
    "Doctor: Any nausea or vomiting?",
    "Patient: Some nausea, no vomiting.",
  ];

  useEffect(() => {
    // Auto-run the demo sequence
    const seq = async () => {
      await delay(600);
      // Type patient ID
      for (let i = 0; i <= patientId.length; i++) {
        await delay(60);
        setTypedId(patientId.slice(0, i));
      }
      await delay(500);
      setStep(1); // show patient card
      await delay(1000);
      setStep(2); // show recording
      setRecording(true);
      timerRef.current = setInterval(() => setRecTimer((t) => t + 1), 1000);
      // Add transcript lines
      for (let i = 0; i < lines.length; i++) {
        await delay(1800);
        setTranscript((t) => [...t, lines[i]]);
      }
      await delay(1400);
      if (timerRef.current) clearInterval(timerRef.current);
      setRecording(false);
      setStep(3);
      await delay(800);
      setShowRx(true);
    };
    seq();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []); // eslint-disable-line

  const mm = String(Math.floor(recTimer / 60)).padStart(2, "0");
  const ss = String(recTimer % 60).padStart(2, "0");

  return (
    <div
      className="relative w-full max-w-[560px] rounded-2xl overflow-hidden"
      style={{
        background: "rgba(13,21,38,0.95)",
        border: "1px solid rgba(255,255,255,0.09)",
        boxShadow: "0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(59,130,246,0.1)",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Window chrome */}
      <div
        className="flex items-center gap-[6px] px-4 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(6,13,26,0.6)" }}
      >
        {["#FF5F57","#FEBC2E","#28C840"].map((c) => (
          <span key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />
        ))}
        <span
          className="ml-3 text-[11px] flex-1 text-center"
          style={{ color: "rgba(148,163,184,0.5)", fontFamily: "JetBrains Mono" }}
        >
          mediscript.app — consultation
        </span>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {/* Patient search */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: "rgba(100,116,139,0.8)" }}>
            Patient ID Lookup
          </p>
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(59,130,246,0.2)" }}
          >
            <Search size={14} style={{ color: "#60A5FA", flexShrink: 0 }} />
            <span
              className="text-[13px] flex-1"
              style={{ color: typedId ? "white" : "rgba(100,116,139,0.5)", fontFamily: "JetBrains Mono" }}
            >
              {typedId || "Enter patient ID…"}
            </span>
            {typedId.length === patientId.length && (
              <span
                className="text-[10px] font-semibold px-2 py-[2px] rounded-full"
                style={{ background: "rgba(5,150,105,0.2)", color: "#4ADE80", border: "1px solid rgba(5,150,105,0.3)" }}
              >
                Found
              </span>
            )}
          </div>
        </div>

        {/* Patient card */}
        {step >= 1 && (
          <div
            className="rounded-xl p-4 flex items-center gap-4"
            style={{
              background: "linear-gradient(135deg, rgba(37,99,235,0.18) 0%, rgba(99,102,241,0.12) 100%)",
              border: "1px solid rgba(59,130,246,0.2)",
              animation: "slideUp 0.35s ease both",
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#3B82F6,#6366F1)" }}
            >
              RT
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-white">Ram Bahadur Thapa</p>
              <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.7)" }}>
                Male, 32 · B+ · 4 previous visits
              </p>
            </div>
            <span
              className="text-[10px] font-semibold px-2 py-1 rounded-full"
              style={{ background: "rgba(5,150,105,0.18)", color: "#4ADE80", border: "1px solid rgba(5,150,105,0.25)" }}
            >
              Active
            </span>
          </div>
        )}

        {/* Recording */}
        {step >= 2 && (
          <div
            className="rounded-xl p-4"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${recording ? "rgba(239,68,68,0.35)" : "rgba(59,130,246,0.18)"}`,
              animation: "slideUp 0.35s ease both",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {recording ? (
                  <>
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: "#EF4444", boxShadow: "0 0 6px rgba(239,68,68,0.8)", animation: "pulse-dot 1.2s ease infinite" }}
                    />
                    <span className="text-[12px] font-medium" style={{ color: "#EF4444" }}>Recording</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full" style={{ background: "#4ADE80" }} />
                    <span className="text-[12px] font-medium" style={{ color: "#4ADE80" }}>Processed</span>
                  </>
                )}
              </div>
              <span className="text-[11px]" style={{ color: "rgba(148,163,184,0.5)", fontFamily: "JetBrains Mono" }}>
                {recording ? `${mm}:${ss}` : "00:07"}
              </span>
            </div>
            {/* Waveform */}
            <div className="flex items-center gap-[3px] h-8">
              {Array.from({ length: 32 }).map((_, i) => {
                const h = recording ? Math.random() * 24 + 4 : [8,14,20,12,18,10,22,16,8,20,14,10,18,22,12,16,8,20,14,18,10,22,12,16,8,14,20,10,18,22,12,16][i % 32];
                return (
                  <div
                    key={i}
                    className="flex-shrink-0 rounded-full transition-all duration-150"
                    style={{
                      width: 3,
                      height: h,
                      background: recording ? "rgba(239,68,68,0.7)" : "rgba(99,102,241,0.6)",
                    }}
                  />
                );
              })}
            </div>
            {/* Transcript */}
            <div
              className="mt-3 rounded-lg p-3 overflow-hidden"
              style={{ background: "rgba(0,0,0,0.25)", maxHeight: 90 }}
            >
              {transcript.map((line, i) => (
                <p
                  key={i}
                  className="text-[11px] mb-1 leading-relaxed"
                  style={{
                    fontFamily: "JetBrains Mono",
                    color: line.startsWith("Doctor") ? "#60A5FA" : "#34D399",
                    animation: "slideUp 0.3s ease both",
                  }}
                >
                  {line}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Generated prescription */}
        {showRx && (
          <div
            className="rounded-xl overflow-hidden"
            style={{
              border: "1px solid rgba(5,150,105,0.3)",
              animation: "slideUp 0.4s ease both",
            }}
          >
            <div
              className="flex items-center gap-2 px-4 py-[10px]"
              style={{ background: "rgba(5,150,105,0.12)", borderBottom: "1px solid rgba(5,150,105,0.2)" }}
            >
              <Pill size={13} style={{ color: "#4ADE80" }} />
              <span className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: "#4ADE80" }}>
                AI Generated Prescription
              </span>
              <span
                className="ml-auto text-[9px] font-semibold px-2 py-[2px] rounded-full"
                style={{ background: "rgba(5,150,105,0.2)", color: "#4ADE80", border: "1px solid rgba(5,150,105,0.3)" }}
              >
                Review required
              </span>
            </div>
            <div className="p-4 grid grid-cols-2 gap-2">
              {[
                { drug: "Paracetamol 500mg", dose: "TID × 5 days" },
                { drug: "ORS sachets", dose: "2–3 per day" },
                { drug: "Vitamin C 500mg", dose: "OD × 5 days" },
                { drug: "Rest advised", dose: "Avoid cold" },
              ].map((rx) => (
                <div
                  key={rx.drug}
                  className="rounded-lg p-[10px]"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <p className="text-[11px] font-semibold text-white">{rx.drug}</p>
                  <p className="text-[10px] mt-[2px]" style={{ color: "rgba(148,163,184,0.6)" }}>{rx.dose}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────
// Features section
// ─────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Mic,
    color: "#3B82F6",
    bg: "rgba(59,130,246,0.12)",
    title: "Live Consultation Recording",
    desc: "One-tap recording captures every word of the doctor–patient conversation with crystal-clear accuracy, even in noisy clinic environments.",
  },
  {
    icon: Zap,
    color: "#8B5CF6",
    bg: "rgba(139,92,246,0.12)",
    title: "Instant AI Transcription",
    desc: "Powered by Whisper and our clinical LLM, conversations are transcribed and structured into standardized medical notes in under 30 seconds.",
  },
  {
    icon: ClipboardList,
    color: "#06B6D4",
    bg: "rgba(6,182,212,0.12)",
    title: "Structured OPD Notes",
    desc: "Automatically organizes consultation data into seven clinical sections: complaint, symptoms, history, diagnosis, notes, prescription, and follow-up.",
  },
  {
    icon: Pill,
    color: "#10B981",
    bg: "rgba(16,185,129,0.12)",
    title: "Automatic Prescriptions",
    desc: "AI generates draft prescriptions based on diagnosis context. Doctors review, edit, and confirm — no typing required.",
  },
  {
    icon: Shield,
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.12)",
    title: "Secure Patient Records",
    desc: "All consultation data is encrypted at rest and in transit. Full audit trails. HIPAA-compliant data handling built in from day one.",
  },
  {
    icon: HeartPulse,
    color: "#EF4444",
    bg: "rgba(239,68,68,0.12)",
    title: "Patient History Timeline",
    desc: "Every patient builds a longitudinal record. Previous consultations, diagnoses, and prescriptions are always one click away.",
  },
];

function FeaturesSection() {
  const { ref, inView } = useInView(0.1);
  return (
    <section id="home" className="py-28 relative" ref={ref}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <span
            className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] px-4 py-2 rounded-full mb-5"
            style={{ background: "rgba(59,130,246,0.12)", color: "#60A5FA", border: "1px solid rgba(59,130,246,0.2)" }}
          >
            <Zap size={12} /> Features
          </span>
          <h2
            className="text-[38px] lg:text-[48px] font-bold tracking-[-0.8px] leading-tight mb-5"
            style={{ color: "#0F172A", fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Everything a modern clinic needs
          </h2>
          <p className="text-[17px] max-w-2xl mx-auto leading-relaxed" style={{ color: "#475569" }}>
            From the moment the patient enters to the time they leave, MediScript handles the documentation — so you handle the care.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 group"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid rgba(59,130,246,0.12)",
                  opacity: inView ? 1 : 0,
                  transform: inView ? "translateY(0)" : "translateY(24px)",
                  transition: `opacity 0.5s ease ${i * 0.08}s, transform 0.5s ease ${i * 0.08}s, box-shadow 0.2s ease`,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.border = `1px solid ${f.color}33`;
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px ${f.color}18`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(255,255,255,0.07)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: f.bg }}
                >
                  <Icon size={20} style={{ color: f.color }} />
                </div>
                <h3
                  className="text-[16px] font-semibold mb-3"
                  style={{ color: "#0F172A", fontFamily: "'Bricolage Grotesque', sans-serif" }}
                >
                  {f.title}
                </h3>
                <p className="text-[14px] leading-relaxed" style={{ color: "#475569" }}>
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────
// How it works
// ─────────────────────────────────────────────────────
const STEPS = [
  {
    num: "01",
    icon: Search,
    color: "#3B82F6",
    title: "Search patient",
    desc: "Look up any patient by ID or name. MediScript instantly pulls their full history, previous diagnoses, and past prescriptions.",
  },
  {
    num: "02",
    icon: Mic,
    color: "#8B5CF6",
    title: "Start recording",
    desc: "Hit the mic. MediScript listens to the entire consultation and transcribes both doctor and patient speech in real time.",
  },
  {
    num: "03",
    icon: Zap,
    color: "#06B6D4",
    title: "AI generates the note",
    desc: "When you stop recording, the AI structures the conversation into a complete OPD note with diagnosis and prescription draft.",
  },
  {
    num: "04",
    icon: Check,
    color: "#10B981",
    title: "Review and export",
    desc: "Review in seconds, edit if needed, then export as a PDF or save directly to the patient's record. Done.",
  },
];

function HowItWorks() {
  const { ref, inView } = useInView(0.1);
  return (
    <section id="how-it-works" className="py-24 lg:py-28" ref={ref}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-14 lg:mb-16">
          <span
            className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] px-4 py-2 rounded-full mb-5"
            style={{ background: "rgba(139,92,246,0.12)", color: "#A78BFA", border: "1px solid rgba(139,92,246,0.2)" }}
          >
            <Clock size={12} /> How it works
          </span>
          <h2
            className="text-[34px] md:text-[40px] lg:text-[48px] font-bold tracking-[-0.8px] leading-tight mb-4"
            style={{ color: "#0F172A", fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            From conversation to note<br />in under 30 seconds
          </h2>
          <p className="text-[16px] max-w-2xl mx-auto" style={{ color: "#64748B" }}>
            A simple 4-step workflow built for fast clinic visits and clean documentation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 relative">
          {/* connector line */}
          <div
            className="hidden lg:block absolute top-[50px] left-[calc(12.5%+42px)] right-[calc(12.5%+42px)] h-[2px]"
            style={{ background: "linear-gradient(90deg, rgba(59,130,246,0.35), rgba(139,92,246,0.35), rgba(6,182,212,0.35), rgba(16,185,129,0.35))" }}
          />

          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={s.num}
                className="flex flex-col items-center text-center relative rounded-2xl px-5 py-6"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid rgba(59,130,246,0.12)",
                  opacity: inView ? 1 : 0,
                  transform: inView ? "translateY(0)" : "translateY(28px)",
                  transition: `opacity 0.5s ease ${i * 0.12}s, transform 0.5s ease ${i * 0.12}s, box-shadow 0.2s ease`,
                }}
              >
                <div
                  className="relative w-16 h-16 rounded-2xl flex items-center justify-center mb-5 z-10"
                  style={{
                    background: "#FFFFFF",
                    border: `1px solid ${s.color}55`,
                    boxShadow: `0 8px 20px ${s.color}18`,
                  }}
                >
                  <Icon size={22} style={{ color: s.color }} />
                  <span
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center"
                    style={{ background: s.color, color: "white" }}
                  >
                    {i + 1}
                  </span>
                </div>
                <h3
                  className="text-[16px] font-semibold mb-3"
                  style={{ color: "#0F172A", fontFamily: "'Bricolage Grotesque', sans-serif" }}
                >
                  {s.title}
                </h3>
                <p className="text-[14px] leading-relaxed" style={{ color: "#475569" }}>
                  {s.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────
// Social proof / testimonials
// ─────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    name: "Dr. Priya Nair",
    role: "Cardiologist, Apollo Hospitals",
    initials: "PN",
    color: "#3B82F6",
    text: "MediScript has genuinely changed how I practice. I used to spend 40 minutes after hours writing up notes. Now I review an AI draft in 2 minutes and I'm done.",
    stars: 5,
  },
  {
    name: "Dr. Rohan Mehta",
    role: "General Physician, Bangalore",
    initials: "RM",
    color: "#8B5CF6",
    text: "The prescription generation is surprisingly accurate. It catches drug interactions I sometimes miss when I'm seeing 60 patients a day. It's become my safety net.",
    stars: 5,
  },
  {
    name: "Dr. Kabita Thapa",
    role: "Internist, TU Teaching Hospital",
    initials: "KT",
    color: "#10B981",
    text: "We piloted this across 3 wards. Documentation time dropped by 65%. Our residents actually spend time talking to patients now instead of staring at screens.",
    stars: 5,
  },
];

function Testimonials() {
  const { ref, inView } = useInView(0.1);
  return (
    <section className="py-28" ref={ref}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2
            className="text-[38px] lg:text-[44px] font-bold tracking-[-0.8px] leading-tight mb-4"
            style={{ color: "#0F172A", fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Trusted by doctors who care
          </h2>
          <p className="text-[17px]" style={{ color: "#475569" }}>
            Clinicians across South Asia are using MediScript every day.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={t.name}
              className="rounded-2xl p-7 flex flex-col gap-5 hover:-translate-y-1 transition-all duration-200"
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(59,130,246,0.12)",
                opacity: inView ? 1 : 0,
                transform: inView ? "translateY(0)" : "translateY(24px)",
                transition: `opacity 0.5s ease ${i * 0.1}s, transform 0.5s ease ${i * 0.1}s, box-shadow 0.2s ease`,
              }}
            >
              <div className="flex gap-1">
                {Array.from({ length: t.stars }).map((_, j) => (
                  <Star key={j} size={14} style={{ color: "#FBBF24", fill: "#FBBF24" }} />
                ))}
              </div>
              <p className="text-[15px] leading-relaxed flex-1" style={{ color: "#334155" }}>
                "{t.text}"
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0"
                  style={{ background: t.color }}
                >
                  {t.initials}
                </div>
                <div>
                  <p className="text-[14px] font-semibold" style={{ color: "#0F172A" }}>{t.name}</p>
                  <p className="text-[12px]" style={{ color: "#64748B" }}>{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          className="mt-16 rounded-2xl grid grid-cols-2 md:grid-cols-4 divide-x divide-white/5"
          style={{ background: "#FFFFFF", border: "1px solid rgba(59,130,246,0.12)" }}
        >
          {[
            { val: "12,000+", label: "Consultations recorded" },
            { val: "65%", label: "Less time on documentation" },
            { val: "340+", label: "Doctors onboarded" },
            { val: "99.4%", label: "Transcription accuracy" },
          ].map((s, i) => (
            <div key={i} className="py-8 px-6 text-center">
              <p
                className="text-[32px] font-bold mb-2 tracking-[-0.5px]"
                style={{ color: "#0F172A", fontFamily: "'Bricolage Grotesque', sans-serif" }}
              >
                {s.val}
              </p>
              <p className="text-[13px]" style={{ color: "#64748B" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────
// FAQ
// ─────────────────────────────────────────────────────
const FAQS = [
  { q: "How accurate is the transcription?", a: "MediScript uses OpenAI Whisper fine-tuned for clinical dialogue. Transcription accuracy is 99.4% in controlled tests. The AI also corrects common medical term misspellings automatically." },
  { q: "Is patient data stored on your servers?", a: "All data is encrypted at rest using AES-256 and in transit with TLS 1.3. Audio files are processed and deleted immediately after transcription. Notes are stored on your own infrastructure if you self-host." },
  { q: "Does it work offline or in poor internet areas?", a: "Recording works fully offline. Transcription and AI note generation require an internet connection, but we offer a low-bandwidth mode for clinics with limited connectivity." },
  { q: "Can I edit the AI-generated notes?", a: "Yes. Every generated note is fully editable before saving. The doctor always has the final say — AI is a drafting assistant, not a decision maker." },
  { q: "What languages are supported?", a: "Currently English, Nepali, and Hindi. Malay, Tamil, and Bangla are in active development and expected Q3 2025." },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  const { ref, inView } = useInView(0.1);
  return (
    <section id="faq" className="py-28" ref={ref}>
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2
            className="text-[38px] lg:text-[44px] font-bold tracking-[-0.8px] mb-4"
            style={{ color: "#0F172A", fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Frequently asked questions
          </h2>
        </div>
        <div className="flex flex-col gap-3">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden transition-all duration-200"
              style={{
                background: "#FFFFFF",
                border: open === i ? "1px solid rgba(59,130,246,0.3)" : "1px solid rgba(59,130,246,0.12)",
                opacity: inView ? 1 : 0,
                transform: inView ? "translateY(0)" : "translateY(16px)",
                transition: `opacity 0.4s ease ${i * 0.07}s, transform 0.4s ease ${i * 0.07}s, border 0.2s ease`,
              }}
            >
              <button
                className="w-full flex items-center justify-between px-6 py-5 text-left"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span
                  className="text-[15px] font-medium"
                  style={{ color: open === i ? "#0F172A" : "#334155" }}
                >
                  {faq.q}
                </span>
                <ChevronDown
                  size={18}
                  style={{
                    color: "#60A5FA",
                    flexShrink: 0,
                    transform: open === i ? "rotate(180deg)" : "rotate(0)",
                    transition: "transform 0.2s ease",
                  }}
                />
              </button>
              {open === i && (
                <div className="px-6 pb-5">
                  <p className="text-[14px] leading-relaxed" style={{ color: "#64748B" }}>
                    {faq.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────
// CTA section
// ─────────────────────────────────────────────────────
function CTASection({ onEnterApp }: { onEnterApp: () => void }) {
  const { ref, inView } = useInView(0.15);
  return (
    <section className="py-24 px-6" ref={ref}>
      <div
        className="max-w-5xl mx-auto rounded-3xl p-16 text-center relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(219,234,254,1) 0%, rgba(238,242,255,1) 55%, rgba(243,232,255,0.9) 100%)",
          border: "1px solid rgba(99,102,241,0.25)",
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0)" : "translateY(24px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}
      >
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(99,102,241,0.2) 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10">
          <span
            className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] px-4 py-2 rounded-full mb-6"
            style={{ background: "rgba(99,102,241,0.15)", color: "#A78BFA", border: "1px solid rgba(99,102,241,0.25)" }}
          >
            <Zap size={11} /> No setup required
          </span>
          <h2
            className="text-[40px] lg:text-[52px] font-bold tracking-[-1px] leading-tight mb-5"
            style={{ color: "#0F172A", fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Start documenting smarter<br />today
          </h2>
          <p className="text-[17px] mb-10 max-w-xl mx-auto" style={{ color: "#475569" }}>
            Join hundreds of clinicians who've reclaimed hours every week. Free to start, no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onEnterApp}
              className="flex items-center gap-2 text-[15px] font-semibold px-8 py-4 rounded-xl transition-all hover:scale-[1.03]"
              style={{
                background: "linear-gradient(135deg, #2563EB, #4F46E5)",
                color: "white",
                boxShadow: "0 4px 24px rgba(37,99,235,0.5)",
              }}
            >
              Start Consultation <ArrowRight size={16} />
            </button>
            <button
              className="flex items-center gap-2 text-[15px] font-medium px-8 py-4 rounded-xl transition-all hover:bg-white/5"
              style={{ color: "#475569", border: "1px solid rgba(15,23,42,0.12)", background: "#FFFFFF" }}
            >
              <Play size={15} /> View Demo
            </button>
          </div>
          <p className="mt-6 text-[12.5px]" style={{ color: "#64748B" }}>
            AI-powered consultation recording · Automatic prescriptions · Secure patient records
          </p>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────────────
function Footer() {
  return (
    <footer
      className="py-16 px-6"
      style={{ borderTop: "1px solid rgba(15,23,42,0.08)" }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-14">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center gap-[10px] mb-4">
              <div
                className="w-7 h-7 rounded-[8px] flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#3B82F6,#6366F1)", boxShadow: "0 0 14px rgba(99,102,241,0.45)" }}
              >
                <Activity size={14} color="white" strokeWidth={2.5} />
              </div>
              <span
                className="text-[15px] font-bold tracking-[-0.3px]"
                style={{ color: "#0F172A", fontFamily: "'Bricolage Grotesque', sans-serif" }}
              >
                Medi<span style={{ color: "#818CF8" }}>Script</span>
              </span>
            </div>
            <p className="text-[13.5px] leading-relaxed mb-5" style={{ color: "rgba(100,116,139,0.85)", maxWidth: 240 }}>
              The AI-powered consultation recorder built for clinics, hospitals, and private practices.
            </p>
            <div className="flex gap-3">
              {["Built for Clinics", "Hospitals", "Private Practices"].map((t) => (
                <span
                  key={t}
                  className="text-[10px] font-semibold px-3 py-1 rounded-full"
                  style={{ background: "rgba(59,130,246,0.1)", color: "#60A5FA", border: "1px solid rgba(59,130,246,0.18)" }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.09em] mb-4" style={{ color: "rgba(100,116,139,0.7)" }}>
              Product
            </p>
            {["Features", "How It Works", "Pricing", "Changelog", "Roadmap"].map((item) => (
              <a
                key={item}
                href="#"
                className="block text-[13.5px] mb-3 transition-colors"
                style={{ color: "rgba(148,163,184,0.7)" }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#0F172A")}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "rgba(148,163,184,0.7)")}
              >
                {item}
              </a>
            ))}
          </div>

          {/* Company */}
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.09em] mb-4" style={{ color: "rgba(100,116,139,0.7)" }}>
              Company
            </p>
            {["About", "Blog", "Careers", "Press Kit", "Partners"].map((item) => (
              <a
                key={item}
                href="#"
                className="block text-[13.5px] mb-3 transition-colors"
                style={{ color: "rgba(148,163,184,0.7)" }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#0F172A")}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "rgba(148,163,184,0.7)")}
              >
                {item}
              </a>
            ))}
          </div>

          {/* Legal + Contact */}
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.09em] mb-4" style={{ color: "rgba(100,116,139,0.7)" }}>
              Legal &amp; Support
            </p>
            {["Privacy Policy", "Terms of Service", "Cookie Policy", "support@mediscript.ai", "Contact Us"].map((item) => (
              <a
                key={item}
                href={item.includes("@") ? `mailto:${item}` : "#"}
                className="block text-[13.5px] mb-3 transition-colors"
                style={{ color: "rgba(148,163,184,0.7)" }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#0F172A")}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "rgba(148,163,184,0.7)")}
              >
                {item}
              </a>
            ))}
          </div>
        </div>

        <div
          className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8"
          style={{ borderTop: "1px solid rgba(15,23,42,0.08)" }}
        >
          <p className="text-[12.5px]" style={{ color: "rgba(100,116,139,0.6)" }}>
            © 2025 MediScript AI. All rights reserved.
          </p>
          <p className="text-[12.5px]" style={{ color: "rgba(100,116,139,0.55)" }}>
            AI diagnosis suggestions are for clinical assistance only — always verify with professional judgement.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────
// Main LandingPage export
// ─────────────────────────────────────────────────────
interface LandingPageProps {
  onEnterApp: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  return (
    <div
      className="min-h-screen"
      style={{ background: "#F8FAFC", color: "#0F172A" }}
    >
      {/* Inline keyframes */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-dot {
          0%,100% { opacity: 1; }
          50% { opacity: 0.25; }
        }
        @keyframes float {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>

      <Nav onEnterApp={onEnterApp} />

      {/* ── HERO ── */}
      <section
        className="relative pt-36 pb-20 lg:pt-44 lg:pb-28 px-6 overflow-hidden"
        style={{ minHeight: "100vh", display: "flex", alignItems: "center" }}
      >
        {/* Background mesh */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            style={{
              position: "absolute", width: 700, height: 700, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 65%)",
              top: -200, left: -200,
            }}
          />
          <div
            style={{
              position: "absolute", width: 600, height: 600, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 65%)",
              bottom: -100, right: -100,
            }}
          />
          {/* Grid */}
          <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.03 }}>
            <defs>
              <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <div>
              <h1
                className="text-[48px] lg:text-[62px] font-bold leading-[1.06] tracking-[-1.5px] mb-7"
                style={{
                  color: "#0F172A",
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  animation: "slideUp 0.55s ease 0.08s both",
                }}
              >
                The Smartest Way<br />
                to Document a{" "}
                <span
                  style={{
                    background: "linear-gradient(135deg, #60A5FA, #818CF8)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Consultation
                </span>
              </h1>

              <p
                className="text-[18px] leading-relaxed mb-10 max-w-xl"
                style={{
                  color: "#475569",
                  animation: "slideUp 0.55s ease 0.16s both",
                }}
              >
                MediScript records doctor–patient conversations, converts them into structured medical notes, and generates prescriptions automatically.
              </p>

              {/* CTA buttons */}
              <div
                className="flex flex-col sm:flex-row gap-4 mb-8"
                style={{ animation: "slideUp 0.55s ease 0.22s both" }}
              >
                <button
                  onClick={onEnterApp}
                  className="flex items-center justify-center gap-2 text-[15px] font-semibold px-8 py-4 rounded-xl transition-all hover:scale-[1.03]"
                  style={{
                    background: "linear-gradient(135deg, #2563EB, #4F46E5)",
                    color: "white",
                    boxShadow: "0 4px 28px rgba(37,99,235,0.55)",
                  }}
                >
                  <Mic size={17} />
                  Start Consultation
                </button>
                <button
                  className="flex items-center justify-center gap-2 text-[15px] font-medium px-8 py-4 rounded-xl transition-all hover:bg-white/5"
                  style={{ color: "#475569", border: "1px solid rgba(15,23,42,0.12)", background: "#FFFFFF" }}
                >
                  <Play size={15} />
                  View Demo
                </button>
              </div>

              {/* Support line */}
              <p
                className="text-[12.5px]"
                style={{ color: "#64748B", animation: "slideUp 0.55s ease 0.28s both" }}
              >
                AI-powered consultation recording&nbsp;·&nbsp;Automatic prescriptions&nbsp;·&nbsp;Secure patient records
              </p>

              {/* Feature highlights */}
              <div
                className="flex flex-wrap items-center gap-3 mt-7 pt-6"
                style={{
                  borderTop: "1px solid rgba(15,23,42,0.1)",
                  animation: "slideUp 0.55s ease 0.34s both",
                }}
              >
                {["Live Recording", "AI Note Generation", "Prescription Drafts", "Patient History"].map((name) => (
                  <span
                    key={name}
                    className="text-[12px] font-semibold px-3 py-1 rounded-full"
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid rgba(59,130,246,0.16)",
                      color: "#475569",
                    }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>

            {/* Right — hero mockup */}
            <div
              className="flex justify-center lg:justify-end"
              style={{ animation: "slideUp 0.6s ease 0.2s both" }}
            >
              <HeroMockup />
            </div>
          </div>
        </div>
      </section>

      <FeaturesSection />
      <HowItWorks />
      <Testimonials />
      <FAQ />
      <CTASection onEnterApp={onEnterApp} />
      <Footer />
    </div>
  );
};
