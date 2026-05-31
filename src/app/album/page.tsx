'use client';

import { useEffect, useRef, useState } from 'react';
import { WordReveal } from '@/components/WordReveal';
import { Ph } from '@/components/Ph';

const LABELS = [
  'ENSAIO · CAMPO',
  'DETALHE · MÃOS',
  'RETRATO · ELA',
  'RETRATO · ELE',
  'NOIVADO',
  'PEDIDO',
  'FAZENDA',
  'ABRAÇO',
  'ANEL',
  'RISO',
  'PÔR DO SOL',
  'PRÉ-WEDDING',
];

type Photo = { id: number; label: string; orient: 'v' | 'h' | 's' };

const PHOTOS: Photo[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  label: LABELS[i % 12],
  orient: (i % 3 === 0 ? 'v' : i % 3 === 1 ? 'h' : 's') as Photo['orient'],
}));

const SIZES: Record<Photo['orient'], [number, number]> = {
  v: [220, 300],
  h: [260, 190],
  s: [220, 220],
};

export default function AlbumPage() {
  const [active, setActive] = useState(0);
  const scRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scRef.current;
    if (!el) return;
    const on = () => {
      const children = Array.from(el.children) as HTMLElement[];
      const center = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      let bestD = Infinity;
      children.forEach((c, i) => {
        const mid = c.offsetLeft + c.offsetWidth / 2;
        const d = Math.abs(mid - center);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      setActive(best);
    };
    el.addEventListener('scroll', on, { passive: true });
    on();
    return () => el.removeEventListener('scroll', on);
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--ink)',
        color: 'var(--cream)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: '120px 22px 18px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <div className="micro" style={{ color: 'var(--gold-soft)' }}>
          CAPÍTULO II
        </div>
        <WordReveal
          as="div"
          text="álbum de fotos"
          stagger={80}
          className="serif italic"
          style={{ fontSize: 44, lineHeight: 1, marginTop: 8 }}
        />
        <div
          className="italic"
          style={{ fontSize: 13, color: 'rgba(239,231,219,.55)', marginTop: 10, maxWidth: 320 }}
        >
          deslize para ver os dias que nos trouxeram até aqui.
        </div>
      </div>

      <div
        ref={scRef}
        className="phone-scroll"
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          overflowX: 'auto',
          padding: '40px 40vw 40px 22px',
          scrollSnapType: 'x mandatory',
        }}
      >
        {PHOTOS.map((p, i) => {
          const isActive = i === active;
          const [w, h] = SIZES[p.orient];
          return (
            <div
              key={p.id}
              style={{
                flex: `0 0 ${w}px`,
                scrollSnapAlign: 'center',
                transition: 'all .5s cubic-bezier(.2,.7,.2,1)',
                transform: isActive ? 'scale(1)' : 'scale(.9)',
                opacity: isActive ? 1 : 0.45,
              }}
            >
              <div style={{ position: 'relative' }}>
                <Ph label={p.label} style={{ width: w, height: h }} />
                <div
                  className="serif italic"
                  style={{
                    position: 'absolute',
                    left: -6,
                    bottom: -14,
                    fontSize: 24,
                    color: 'var(--gold-soft)',
                    opacity: isActive ? 1 : 0,
                    transition: 'opacity .5s',
                  }}
                >
                  {String(p.id).padStart(2, '0')}.
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          padding: '28px 22px 36px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: 1200,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div className="mono" style={{ fontSize: 10, color: 'rgba(239,231,219,.55)' }}>
          {String(active + 1).padStart(2, '0')} / {String(PHOTOS.length).padStart(2, '0')}
        </div>
        <div style={{ flex: 1, height: 1, background: 'rgba(239,231,219,.14)', margin: '0 16px', position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${((active + 1) / PHOTOS.length) * 100}%`,
              background: 'var(--gold-soft)',
              transition: 'width .4s',
            }}
          />
        </div>
        <div className="micro" style={{ fontSize: 9, color: 'var(--gold-soft)' }}>
          {PHOTOS[active].label}
        </div>
      </div>
    </div>
  );
}
