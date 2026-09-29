'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { RusticIcon } from '@/components/RusticIcon';
import {
  DRESS_REFERENCE_COPY,
  FORBIDDEN_REMINDER,
  FORBIDDEN_SWATCHES,
  SUGGESTED_SWATCHES,
  type DressSwatch,
} from '@/lib/dress-code-content';

function SwatchRow({ swatches, size = 28 }: { swatches: DressSwatch[]; size?: number }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
      {swatches.map((s) => (
        <div key={s.label} style={{ textAlign: 'center', width: size + 4 }}>
          <div
            title={s.label}
            style={{
              width: size,
              height: size,
              margin: '0 auto',
              borderRadius: '50%',
              background: s.color,
              border: '1px solid rgba(23, 59, 102, 0.18)',
              boxShadow: s.color === '#FFFFFF' || s.color === '#F4EFE6' ? 'inset 0 0 0 1px rgba(23,59,102,.12)' : undefined,
            }}
          />
          <span
            className="mono"
            style={{
              display: 'block',
              marginTop: 4,
              fontSize: 7,
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              color: 'var(--texto-suave)',
              lineHeight: 1.2,
            }}
          >
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function DressCodeCard() {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  return (
    <article className="big-day-fact" style={{ height: 'auto' }}>
      <div className="big-day-fact__head">
        <span className="big-day-fact__icon" style={{ color: 'var(--madeira)' }}>
          <RusticIcon name="dress" size={18} />
        </span>
        <span className="big-day-fact__label">Código de vestimenta</span>
      </div>
      <p className="serif big-day-fact__value">
        Traje <span className="italic">esporte fino</span>
      </p>

      <div style={{ marginTop: 4 }}>
        <p className="big-day-fact__detail" style={{ fontSize: 11 }}>
          Evite vermelhos, vinho, coral, branco e off-white
        </p>
        <SwatchRow swatches={FORBIDDEN_SWATCHES} size={22} />
      </div>

      <button type="button" className="big-day-fact__link" style={{ marginTop: 8 }} onClick={() => setOpen(true)}>
        Ver referências
      </button>

      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="gift-modal"
              role="presentation"
              onMouseDown={(e) => e.target === e.currentTarget && close()}
            >
              <div
                className="gift-modal__sheet"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                style={{ width: 'min(480px, 100%)', maxHeight: 'min(90vh, 720px)', overflowY: 'auto' }}
              >
                <h2 id={titleId} className="serif gift-modal__title" style={{ fontSize: 'clamp(28px, 5vw, 36px)' }}>
                  Vestimentas que indicamos
                </h2>
                <p style={{ fontSize: 15, color: 'var(--texto-suave)', lineHeight: 1.55 }}>{DRESS_REFERENCE_COPY}</p>

                <div style={{ marginTop: 22 }}>
                  <p className="micro" style={{ color: 'var(--texto-suave)' }}>Paleta inspiracional</p>
                  <SwatchRow swatches={SUGGESTED_SWATCHES} size={32} />
                </div>

                <div
                  style={{
                    marginTop: 22,
                    padding: '14px 16px',
                    borderRadius: 14,
                    background: 'rgba(196, 30, 58, 0.06)',
                    border: '1px solid rgba(196, 30, 58, 0.12)',
                  }}
                >
                  <p className="micro" style={{ color: 'var(--terracota-esc, #8d3b32)' }}>Cores proibidas</p>
                  <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5, color: 'var(--texto)' }}>{FORBIDDEN_REMINDER}</p>
                  <SwatchRow swatches={FORBIDDEN_SWATCHES} size={24} />
                </div>

                <div className="gift-modal__actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={close}>
                    Fechar
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </article>
  );
}
