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

function Tick({ value, label }: { value: number; label: string }) {
  const str = String(value).padStart(2, '0');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 0 }}>
      <div
        key={value}
        className="tick-in serif"
        style={{ fontSize: 42, lineHeight: 1, color: 'var(--cream)', fontWeight: 300, letterSpacing: '.01em' }}
      >
        {str}
      </div>
      <div className="micro" style={{ marginTop: 8, color: 'rgba(239,231,219,.55)', fontSize: 8 }}>
        {label}
      </div>
    </div>
  );
}

export function Countdown({ compact = false }: { compact?: boolean }) {
  const c = useCountdown();
  if (compact) {
    return (
      <div style={{ display: 'flex', gap: 14, alignItems: 'baseline', justifyContent: 'center' }}>
        {[
          ['MÊS', c.months],
          ['DIAS', c.days],
          ['HRS', c.hours],
          ['MIN', c.mins],
          ['SEG', c.secs],
        ].map(([l, v]) => (
          <div key={String(l)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="serif" style={{ fontSize: 22, lineHeight: 1, color: 'var(--cream)' }}>
              {String(v).padStart(2, '0')}
            </div>
            <div className="micro" style={{ fontSize: 7, color: 'rgba(239,231,219,.5)', marginTop: 3 }}>
              {l}
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', gap: 8, padding: '0 16px', alignItems: 'baseline' }}>
      <Tick value={c.months} label="MÊS" />
      <Tick value={c.days} label="DIAS" />
      <Tick value={c.hours} label="HORAS" />
      <Tick value={c.mins} label="MIN" />
      <Tick value={c.secs} label="SEG" />
    </div>
  );
}
