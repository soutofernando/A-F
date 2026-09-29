'use client';

import { useEffect, useState } from 'react';

export const WEDDING_DATE = new Date('2026-11-28T09:00:00-03:00').getTime();

export function useCountdown(target = WEDDING_DATE) {
  const [now, setNow] = useState(() => target);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  let diff = Math.max(0, target - now);
  const totalDays = Math.floor(diff / 86400000);
  diff -= totalDays * 86400000;
  const months = Math.floor(totalDays / 30);
  const days = totalDays - months * 30;
  const hours = Math.floor(diff / 3600000);
  diff -= hours * 3600000;
  const mins = Math.floor(diff / 60000);
  diff -= mins * 60000;
  const secs = Math.floor(diff / 1000);
  return { months, days, hours, mins, secs, totalDays };
}

function Digit({ n }: { n: string }) {
  const value = Number(n);
  return (
    <span className="roll-window" aria-hidden>
      <span className="roll-strip" style={{ transform: `translateY(-${value}em)` }}>
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i}>{i}</span>
        ))}
      </span>
    </span>
  );
}

const LABEL_COLORS = [
  'var(--ink-blue)',
  'var(--btn-secondary)',
  'var(--azul-hero)',
  'var(--texto-suave)',
  'var(--texto-discreto)',
] as const;

function Tick({ value, label, labelIndex }: { value: number; label: string; labelIndex: number }) {
  const str = String(value).padStart(2, '0');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 0 }}>
      <div className="serif" style={{ fontSize: 'clamp(32px, 8vw, 48px)', lineHeight: 1, color: 'var(--ink-blue)', fontWeight: 400 }}>
        <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{str}</span>
        <Digit n={str[0]} />
        <Digit n={str[1]} />
      </div>
      <div className="micro" style={{ marginTop: 8, color: LABEL_COLORS[labelIndex % LABEL_COLORS.length] }}>
        {label}
      </div>
    </div>
  );
}

export function Countdown({ compact = false, target }: { compact?: boolean; target?: number }) {
  const c = useCountdown(target ?? WEDDING_DATE);
  const items: Array<[string, number]> = [
    ['mês', c.months],
    ['dias', c.days],
    ['horas', c.hours],
    ['min', c.mins],
    ['seg', c.secs],
  ];
  if (compact) {
    return (
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
        {items.map(([label, value]) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div className="serif" style={{ fontSize: 28, lineHeight: 1, color: 'var(--azul-profundo)' }}>
              {String(value).padStart(2, '0')}
            </div>
            <div className="micro" style={{ color: 'var(--texto-suave)', marginTop: 4 }}>
              {label}
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', width: '100%', maxWidth: 520, margin: '0 auto' }}>
      {items.map(([label, value], index) => (
        <Tick key={label} value={value} label={label} labelIndex={index} />
      ))}
    </div>
  );
}
