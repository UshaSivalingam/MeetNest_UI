// src/pages/WelcomePage.jsx

import { useState, useEffect } from "react";
import "../styles/WelcomePage.css";

const people = [
  { id:1, angle:0,   color:"#EAB308", delay:0.0  },
  { id:2, angle:45,  color:"#22C55E", delay:0.2  },
  { id:3, angle:90,  color:"#3B82F6", delay:0.35 },
  { id:4, angle:135, color:"#84CC16", delay:0.5  },
  { id:5, angle:180, color:"#0EA5E9", delay:0.65 },
  { id:6, angle:225, color:"#F59E0B", delay:0.8  },
  { id:7, angle:270, color:"#16A34A", delay:0.95 },
  { id:8, angle:315, color:"#60A5FA", delay:1.1  },
];
const CHAIR_ANGLES = [0,45,90,135,180,225,270,315];

function getPersonPos(angle, seated) {
  const rad = (angle * Math.PI) / 180;
  const r   = seated ? 108 : 290;
  return { x: Math.cos(rad) * r, y: Math.sin(rad) * r };
}
function getChairPos(angle) {
  const rad = (angle * Math.PI) / 180;
  const r   = 98;
  return { x: Math.cos(rad) * r, y: Math.sin(rad) * r, rot: angle + 90 };
}
function chairStroke(i) {
  return i%3===0 ? "rgba(202,138,4,0.3)" : i%3===1 ? "rgba(22,163,74,0.3)" : "rgba(37,99,235,0.3)";
}

export default function WelcomePage({ onFinish }) {
  const [seated,      setSeated]      = useState(false);
  const [showTitle,   setShowTitle]   = useState(false);
  const [showTagline, setShowTagline] = useState(false);
  const [fadeOut,     setFadeOut]     = useState(false);
  const [progress,    setProgress]    = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setSeated(true),      400);
    const t2 = setTimeout(() => setShowTitle(true),   1900);
    const t3 = setTimeout(() => setShowTagline(true), 2500);
    const t4 = setTimeout(() => setFadeOut(true),     4000); //4700
    const t5 = setTimeout(() => onFinish?.(),         4700); //5400
    return () => [t1,t2,t3,t4,t5].forEach(clearTimeout);
  }, [onFinish]);

  useEffect(() => {
    const startDelay = 2500, duration = 2100;
    let raf;
    const startTime = performance.now() + startDelay;
    const tick = (now) => {
      const elapsed = now - startTime;
      if (elapsed < 0) { raf = requestAnimationFrame(tick); return; }
      setProgress(Math.min((elapsed / duration) * 100, 100));
      if (elapsed < duration) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={`welcome-page${fadeOut ? " fade-out" : ""}`}>

      {/* Blobs */}
      <div className="welcome-blob welcome-blob--yellow-tl" />
      <div className="welcome-blob welcome-blob--blue-tr"   />
      <div className="welcome-blob welcome-blob--green-br"  />
      <div className="welcome-blob welcome-blob--sky-ml"    />
      <div className="welcome-blob welcome-blob--lime-mr"   />

      {/* Dot pattern */}
      <svg className="welcome-dot-pattern" aria-hidden="true">
        <defs>
          <pattern id="triDots" x="0" y="0" width="36" height="36" patternUnits="userSpaceOnUse">
            <circle cx="4"  cy="4"  r="1.2" fill="rgba(234,179,8,0.18)"  />
            <circle cx="22" cy="18" r="1.2" fill="rgba(34,197,94,0.15)"  />
            <circle cx="10" cy="28" r="1.2" fill="rgba(59,130,246,0.14)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#triDots)" />
      </svg>

      {/* SVG Scene */}
      <div className="welcome-scene">
        <svg viewBox="-285 -265 570 530" xmlns="http://www.w3.org/2000/svg">

          {/* Orbit rings */}
          <circle r="152" fill="none" stroke="rgba(234,179,8,0.12)"  strokeWidth="1.2" />
          <circle r="160" fill="none" stroke="rgba(34,197,94,0.08)"  strokeWidth="1"   strokeDasharray="6 10" />
          <circle r="170" fill="none" stroke="rgba(59,130,246,0.08)" strokeWidth="1"   strokeDasharray="2 12" />

          {/* Spinning table */}
          <g className="table-spin">
            <ellipse cx="3" cy="8" rx="76" ry="76" fill="rgba(59,130,246,0.07)" />
            <ellipse cx="0" cy="0" rx="74" ry="74" fill="url(#tableGrad)" stroke="url(#tableStroke)" strokeWidth="2.5" />
            <ellipse cx="0" cy="0" rx="60" ry="60" fill="none" stroke="rgba(34,197,94,0.22)"  strokeWidth="1.2" strokeDasharray="5 4" />
            <ellipse cx="0" cy="0" rx="44" ry="44" fill="none" stroke="rgba(59,130,246,0.15)" strokeWidth="0.8" />
            <ellipse cx="0" cy="0" rx="28" ry="28" fill="none" stroke="rgba(234,179,8,0.18)"  strokeWidth="0.6" />
            <text x="0"   y="-9" textAnchor="middle" dominantBaseline="middle" fill="#CA8A04" fontSize="11" fontWeight="bold" letterSpacing="4" fontFamily="Georgia,serif">MEET</text>
            <text x="-14" y="10" textAnchor="middle" dominantBaseline="middle" fill="#16A34A" fontSize="11" fontWeight="bold" fontFamily="Georgia,serif">N</text>
            <text x="6"   y="10" textAnchor="middle" dominantBaseline="middle" fill="#2563EB" fontSize="11" fontWeight="bold" letterSpacing="4" fontFamily="Georgia,serif">EST</text>
            <circle r="4"   fill="url(#centerDot)" />
            <circle r="1.8" fill="#fff" opacity="0.95" />
          </g>

          {/* Chairs */}
          {CHAIR_ANGLES.map((angle, i) => {
            const c = getChairPos(angle);
            return (
              <g key={i} transform={`translate(${c.x},${c.y}) rotate(${c.rot})`}>
                <rect x="-10" y="-7" width="20" height="14" rx="5" fill="rgba(255,255,255,0.92)" stroke={chairStroke(i)} strokeWidth="1.8" />
                <rect x="-7" y="-11" width="14" height="6"  rx="3" fill="rgba(248,250,252,0.9)"  stroke={chairStroke(i)} strokeWidth="1.2" />
              </g>
            );
          })}

          {/* People */}
          {people.map((p) => {
            const pos = getPersonPos(p.angle, seated);
            return (
              <g key={p.id} className="welcome-person" style={{ transform:`translate(${pos.x}px,${pos.y}px)`, transitionDelay:`${p.delay}s` }}>
                <circle r="26" fill={p.color} opacity="0.14" />
                <circle r="16" fill="rgba(255,255,255,0.78)" stroke={p.color} strokeWidth="2.2" />
                <circle cy="-6" r="7" fill={p.color} opacity="0.9" />
                <path d="M -7 2 Q 0 13 7 2" fill={p.color} opacity="0.75" />
                <circle cx="-2" cy="-9" r="2" fill="rgba(255,255,255,0.65)" />
              </g>
            );
          })}

          <defs>
            <radialGradient id="tableGrad" cx="38%" cy="35%">
              <stop offset="0%"   stopColor="#ffffff" />
              <stop offset="45%"  stopColor="#f0fdf4" />
              <stop offset="100%" stopColor="#eff6ff" />
            </radialGradient>
            <linearGradient id="tableStroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#EAB308" stopOpacity="0.6" />
              <stop offset="50%"  stopColor="#22C55E" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.5" />
            </linearGradient>
            <radialGradient id="centerDot" cx="40%" cy="40%">
              <stop offset="0%"   stopColor="#EAB308" />
              <stop offset="50%"  stopColor="#22C55E" />
              <stop offset="100%" stopColor="#3B82F6" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      {/* Title */}
      <div className={`welcome-title-wrapper${showTitle ? " visible" : ""}`}>
        <h1 className="welcome-title">
          <span className="meet">Meet</span>
          <span className="n">N</span>
          <span className="est">est</span>
        </h1>
        <div className="welcome-title-underline" />
      </div>

      {/* Tagline */}
      <div className={`welcome-tagline-wrapper${showTagline ? " visible" : ""}`}>
        <p className="welcome-tagline-main">Welcome to MeetNest</p>
        <p className="welcome-tagline-sub">Smart Meeting Room Management</p>
      </div>

      {/* Progress bar */}
      <div className={`welcome-progress-wrapper${showTagline ? " visible" : ""}`}>
        <div className="welcome-progress-track">
          <div className="welcome-progress-fill" style={{ width:`${progress}%` }} />
        </div>
        <p className="welcome-progress-label">Redirecting to login...</p>
      </div>

    </div>
  );
}