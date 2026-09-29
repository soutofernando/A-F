import type { CSSProperties } from 'react';
import Link from 'next/link';
import { FieldBackdrop } from '@/components/FieldBackdrop';
import { RusticIcon } from '@/components/RusticIcon';

const stepStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  textDecoration: 'none',
  padding: '8px 10px',
};

export function HowItWorks() {
  return (
    <section id="como" className="has-field" style={{ padding: '28px 22px 10px', maxWidth: 980, margin: '0 auto' }}>
      <FieldBackdrop tone="gold" />
      <div className="how-grid">
        <a href="#confirmar" className="how-step" style={stepStyle}>
          <span className="medallion" style={{ color: 'var(--terracota)' }}>
            <RusticIcon name="seal" />
          </span>
          <span>
            <span className="serif" style={{ display: 'block', fontSize: 22, color: 'var(--dourado-esc)' }}>
              1
            </span>
            <span className="serif" style={{ display: 'block', fontSize: 26, color: 'var(--azul-profundo)', lineHeight: 1.1 }}>
              Confirme sua presença
            </span>
          </span>
        </a>
        <svg width="72" height="28" viewBox="0 0 72 28" aria-hidden className="how-bridge">
          <path className="how-line" d="M2 16 C 20 4, 48 26, 70 12" fill="none" stroke="var(--terracota)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <Link href="/presentes" className="how-step" style={stepStyle}>
          <span className="medallion" style={{ color: 'var(--oliva-esc)' }}>
            <RusticIcon name="gift" />
          </span>
          <span>
            <span className="serif" style={{ display: 'block', fontSize: 22, color: 'var(--dourado-esc)' }}>
              2
            </span>
            <span className="serif" style={{ display: 'block', fontSize: 26, color: 'var(--azul-profundo)', lineHeight: 1.1 }}>
              Escolha um presente para os noivos
            </span>
          </span>
        </Link>
      </div>
      <style jsx>{`
        .how-grid {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 12px;
          align-items: stretch;
          background: var(--bg-alt);
          border-radius: 28px;
          padding: 22px 18px;
        }
        @media (max-width: 720px) {
          .how-grid {
            grid-template-columns: 1fr;
          }
          .how-bridge {
            transform: rotate(90deg);
            justify-self: center;
          }
        }
      `}</style>
    </section>
  );
}
