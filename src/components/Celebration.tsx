'use client';

import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';

const GOLD = ['#D4AF7A', '#E8C58A', '#A88A5C', '#F5EDE0', '#EFE7DB'];

export function Celebration() {
  const firedRef = useRef(false);
  const [exiting, setExiting] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setExiting(true), 2000);
    const t2 = setTimeout(() => setGone(true), 2650);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const intervals: ReturnType<typeof setInterval>[] = [];

    // Burst central — abertura
    confetti({
      particleCount: 90,
      spread: 110,
      origin: { y: 0.35 },
      colors: GOLD,
      ticks: 240,
      scalar: 1.1,
      gravity: 0.6,
    });

    // Canhões laterais (entram um pouco depois pra criar profundidade)
    timeouts.push(
      setTimeout(() => {
        if (cancelled) return;
        confetti({
          particleCount: 55,
          angle: 60,
          spread: 60,
          startVelocity: 55,
          origin: { x: 0, y: 0.7 },
          colors: GOLD,
          shapes: ['square', 'circle'],
          scalar: 0.9,
        });
        confetti({
          particleCount: 55,
          angle: 120,
          spread: 60,
          startVelocity: 55,
          origin: { x: 1, y: 0.7 },
          colors: GOLD,
          shapes: ['square', 'circle'],
          scalar: 0.9,
        });
      }, 250),
    );

    // Chuva suave ao longo de ~3s
    const rainEnd = Date.now() + 3200;
    intervals.push(
      setInterval(() => {
        if (cancelled || Date.now() > rainEnd) return;
        confetti({
          particleCount: 4,
          startVelocity: 15,
          spread: 360,
          origin: { x: Math.random(), y: Math.random() * 0.18 },
          colors: GOLD,
          gravity: 0.35,
          scalar: 0.75,
          ticks: 220,
        });
      }, 110),
    );

    // Burst final — quando o painel se firma
    timeouts.push(
      setTimeout(() => {
        if (cancelled) return;
        confetti({
          particleCount: 60,
          spread: 140,
          origin: { y: 0.5 },
          colors: GOLD,
          shapes: ['circle'],
          scalar: 0.7,
          gravity: 0.4,
        });
      }, 1900),
    );

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
      intervals.forEach(clearInterval);
    };
  }, []);

  if (gone) return null;

  return (
    <div className="celebration-overlay" aria-hidden="true">
      <div className={`celebration-stage${exiting ? ' is-exiting' : ''}`}>
        <div className="celebration-halo" />
        <div className="celebration-medallion">
          <div className="celebration-medallion-spin">
            <Seal />
          </div>
        </div>
        <div className="celebration-stamp-wrap">
          <div className="celebration-stamp">confirmado</div>
        </div>
      </div>
    </div>
  );
}

function Seal() {
  return (
    <svg viewBox="0 0 200 200" width="180" height="180" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="sealMain" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#F2D9A8" />
          <stop offset="40%" stopColor="#D4AF7A" />
          <stop offset="80%" stopColor="#9C7A48" />
          <stop offset="100%" stopColor="#5E4321" />
        </radialGradient>
        <radialGradient id="sealHighlight" cx="35%" cy="25%" r="40%">
          <stop offset="0%" stopColor="rgba(255, 250, 220, .9)" />
          <stop offset="60%" stopColor="rgba(255, 250, 220, 0)" />
        </radialGradient>
        <linearGradient id="sealRim" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E8C58A" />
          <stop offset="100%" stopColor="#7C5C2E" />
        </linearGradient>
      </defs>

      {/* Anel externo */}
      <circle cx="100" cy="100" r="96" fill="url(#sealRim)" />
      <circle cx="100" cy="100" r="92" fill="url(#sealMain)" stroke="#5E4321" strokeWidth="1" />

      {/* Pontos decorativos no perímetro */}
      <g fill="#3A2A14">
        {Array.from({ length: 32 }).map((_, i) => {
          const angle = (i / 32) * Math.PI * 2;
          const r = 84;
          const cx = 100 + Math.cos(angle) * r;
          const cy = 100 + Math.sin(angle) * r;
          return <circle key={i} cx={cx} cy={cy} r="1.4" opacity=".5" />;
        })}
      </g>

      {/* Anel interno fino */}
      <circle cx="100" cy="100" r="76" fill="none" stroke="rgba(58, 42, 20, .35)" strokeWidth=".8" />
      <circle cx="100" cy="100" r="78" fill="none" stroke="rgba(255, 248, 230, .25)" strokeWidth=".5" />

      {/* Monograma — insígnia AeF */}
      <image
        href="/AeF.png"
        x="34"
        y="66"
        width="132"
        height="76"
        preserveAspectRatio="xMidYMid meet"
        opacity="0.95"
      />

      {/* Estrelinhas decorativas */}
      <text x="100" y="42" textAnchor="middle" fontSize="11" fill="#3A2A14" opacity=".7">✦</text>
      <text x="100" y="170" textAnchor="middle" fontSize="11" fill="#3A2A14" opacity=".7">✦</text>

      {/* Data do casamento */}
      <text
        x="100"
        y="150"
        textAnchor="middle"
        fontFamily="'Inter', sans-serif"
        fontSize="7.5"
        letterSpacing="1.2"
        fill="#3A2A14"
        opacity=".65"
      >
        28 DE NOVEMBRO DE 2026
      </text>

      {/* Reflexo / brilho 3D */}
      <ellipse cx="80" cy="70" rx="55" ry="35" fill="url(#sealHighlight)" />
    </svg>
  );
}
