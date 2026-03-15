import React from "react";

export const ConsultationAnimation: React.FC = () => {
  return (
    <div className="relative w-full max-w-[600px] mx-auto">
      <style>{`
        .scene-root {
          animation: floatUpDown 4s ease-in-out infinite;
          transform-origin: center;
          filter: drop-shadow(0 18px 34px rgba(12, 35, 64, 0.16));
        }

        .doctor-talk {
          animation: altTalk 4.5s ease-in-out infinite;
          transform-origin: center;
        }

        .doctor-bounce {
          animation: talkBounce 4.5s ease-in-out infinite;
          transform-origin: center;
        }

        .patient-talk {
          animation: altTalk 4.5s ease-in-out infinite reverse;
          transform-origin: center;
        }

        .dot-1 {
          animation: dotPulse 1.2s ease-in-out infinite;
        }

        .dot-2 {
          animation: dotPulse 1.2s ease-in-out infinite 0.2s;
        }

        .dot-3 {
          animation: dotPulse 1.2s ease-in-out infinite 0.4s;
        }

        .ecg-line {
          stroke-dasharray: 430;
          stroke-dashoffset: 430;
          animation: ecgDraw 3s linear infinite;
        }

        .mic-ring {
          transform-box: fill-box;
          transform-origin: center;
          animation: pulseRing 1.5s ease-out infinite;
        }

        .mic-ring.delay {
          animation-delay: 0.75s;
        }

        .icon-float {
          transform-box: fill-box;
          transform-origin: center;
          animation: floatIcon 5s ease-in-out infinite;
        }

        .icon-float.delay {
          animation-delay: 1.5s;
        }

        .doctor-hand {
          transform-box: fill-box;
          transform-origin: 198px 210px;
          animation: writingHand 1.8s ease-in-out infinite;
        }

        @keyframes talkBounce {
          0%, 56%, 100% { transform: scale(0.92); }
          6%, 46% { transform: scale(1); }
          12% { transform: scale(1.04); }
        }

        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.32; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-2px); }
        }

        @keyframes altTalk {
          0%, 52% { opacity: 1; }
          56%, 100% { opacity: 0; }
        }

        @keyframes floatUpDown {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        @keyframes ecgDraw {
          0% { stroke-dashoffset: 430; }
          100% { stroke-dashoffset: -430; }
        }

        @keyframes pulseRing {
          0% { opacity: 0.55; transform: scale(1); }
          100% { opacity: 0; transform: scale(2); }
        }

        @keyframes floatIcon {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        @keyframes writingHand {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
      `}</style>

      <svg
        width="100%"
        viewBox="0 0 520 380"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Doctor and patient consultation animation"
      >
        <g className="scene-root">
          <rect x="18" y="24" width="484" height="332" rx="22" fill="#EFF6FF" />
          <rect x="44" y="262" width="432" height="72" rx="16" fill="#FFFFFF" stroke="#D9ECFF" />

          <g className="icon-float delay">
            <rect x="66" y="62" width="24" height="30" rx="4" fill="#FFFFFF" stroke="#0284C7" strokeWidth="1.8" />
            <rect x="74" y="56" width="8" height="8" rx="2" fill="#0EA5E9" />
            <path d="M72 74H84" stroke="#0369A1" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M72 80H84" stroke="#0369A1" strokeWidth="1.8" strokeLinecap="round" />
          </g>

          <g className="icon-float">
            <rect x="434" y="58" width="26" height="26" rx="8" fill="#FFFFFF" stroke="#0284C7" strokeWidth="1.8" />
            <path d="M447 64V78" stroke="#0369A1" strokeWidth="2" strokeLinecap="round" />
            <path d="M440 71H454" stroke="#0369A1" strokeWidth="2" strokeLinecap="round" />
          </g>

          <g className="doctor-talk">
            <g className="doctor-bounce">
              <rect x="92" y="88" width="102" height="44" rx="13" fill="#FFFFFF" stroke="#0369A1" strokeWidth="2" />
              <path d="M126 132L136 144L146 132" fill="#FFFFFF" stroke="#0369A1" strokeWidth="2" strokeLinejoin="round" />
              <circle className="dot-1" cx="126" cy="110" r="3.4" fill="#0369A1" />
              <circle className="dot-2" cx="142" cy="110" r="3.4" fill="#0369A1" />
              <circle className="dot-3" cx="158" cy="110" r="3.4" fill="#0369A1" />
            </g>
          </g>

          <g className="patient-talk">
            <rect x="328" y="84" width="102" height="44" rx="13" fill="#FFFFFF" stroke="#4F46E5" strokeWidth="2" />
            <path d="M362 128L372 140L382 128" fill="#FFFFFF" stroke="#4F46E5" strokeWidth="2" strokeLinejoin="round" />
            <circle className="dot-1" cx="362" cy="106" r="3.4" fill="#4F46E5" />
            <circle className="dot-2" cx="378" cy="106" r="3.4" fill="#4F46E5" />
            <circle className="dot-3" cx="394" cy="106" r="3.4" fill="#4F46E5" />
          </g>

          <g>
            <rect x="98" y="274" width="72" height="44" rx="10" fill="#DCEEFF" />
            <ellipse cx="142" cy="166" rx="21" ry="23" fill="#F5D4BE" />
            <ellipse cx="142" cy="154" rx="20" ry="12" fill="#0C2340" />
            <rect x="120" y="188" width="48" height="66" rx="12" fill="#FFFFFF" stroke="#D7E9FB" />
            <path d="M120 214L100 236" stroke="#0C2340" strokeWidth="8" strokeLinecap="round" />
            <path d="M168 214L198 228" stroke="#0C2340" strokeWidth="8" strokeLinecap="round" />
            <g className="doctor-hand">
              <path d="M198 228L220 210" stroke="#0C2340" strokeWidth="8" strokeLinecap="round" />
            </g>
            <rect x="218" y="194" width="36" height="46" rx="6" fill="#FFFFFF" stroke="#0284C7" />
            <path d="M228 208H244" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" />
            <path d="M228 216H244" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" />
            <path d="M128 205C132 220 152 220 156 205" stroke="#0284C7" strokeWidth="2.5" fill="none" />
          </g>

          <g>
            <rect x="358" y="272" width="74" height="46" rx="10" fill="#DCEEFF" />
            <ellipse cx="378" cy="170" rx="20" ry="22" fill="#F1CCB0" />
            <rect x="356" y="190" width="46" height="64" rx="12" fill="#7DB9E8" />
            <path d="M356 216L338 242" stroke="#0C2340" strokeWidth="8" strokeLinecap="round" />
            <path d="M402 216L416 240" stroke="#0C2340" strokeWidth="8" strokeLinecap="round" />
            <path d="M362 202C370 194 390 194 398 202" stroke="#334E68" strokeWidth="2" fill="none" />
          </g>

          <g>
            <rect x="160" y="226" width="198" height="12" rx="6" fill="#FFFFFF" stroke="#D6E8FA" />
            <circle className="mic-ring" cx="260" cy="232" r="12" stroke="#0284C7" strokeWidth="2" fill="none" />
            <circle className="mic-ring delay" cx="260" cy="232" r="12" stroke="#0284C7" strokeWidth="2" fill="none" />
            <circle cx="260" cy="232" r="12" fill="#FFFFFF" stroke="#0284C7" strokeWidth="2" />
            <rect x="256.5" y="225.5" width="7" height="10" rx="3.5" fill="#0369A1" />
            <path d="M254.5 236H265.5" stroke="#0369A1" strokeWidth="2" strokeLinecap="round" />
            <path d="M260 237.5V241" stroke="#0369A1" strokeWidth="2" strokeLinecap="round" />
          </g>

          <path
            d="M44 342H110L122 342L133 324L144 352L158 316L173 342H258L270 326L282 350L298 320L312 342H476"
            stroke="#0284C7"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ecg-line"
          />
        </g>
      </svg>
    </div>
  );
};
