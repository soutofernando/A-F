'use client';

import { WordReveal } from '@/components/WordReveal';
import { Ph } from '@/components/Ph';
import {
  DRESS_REFERENCE_COPY,
  FORBIDDEN_REMINDER,
  FORBIDDEN_SWATCHES,
  SUGGESTED_SWATCHES,
  type DressSwatch,
} from '@/lib/dress-code-content';

function SwatchGrid({ swatches }: { swatches: DressSwatch[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
      {swatches.map((s) => (
        <div key={s.label} style={{ width: 56, textAlign: 'center' }}>
          <div
            style={{
              width: 48,
              height: 48,
              margin: '0 auto',
              borderRadius: '50%',
              background: s.color,
              border: '1px solid rgba(14,11,9,.12)',
            }}
          />
          <div
            className="mono"
            style={{
              fontSize: 8,
              color: 'var(--muted)',
              marginTop: 6,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
            }}
          >
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

const REFS = ['LOOK · ELE', 'LOOK · ELA', 'LOOK · ELE 2', 'LOOK · ELA 2'];

export default function DressCodePage() {
  return (
    <div
      data-theme="light"
      style={{ minHeight: '100vh', background: 'var(--bone)', color: 'var(--ink)' }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '120px 22px 12px' }}>
        <div className="micro" style={{ color: 'var(--muted)' }}>
          CAPÍTULO IV
        </div>
        <WordReveal
          as="div"
          text="código de vestimenta"
          stagger={80}
          className="serif italic"
          style={{ fontSize: 38, lineHeight: 1, marginTop: 8, color: 'var(--ink)' }}
        />
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 22px 0' }}>
        <Ph light label="ARRANJO · FLORAL · DETALHE" aspect="4/5" />
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 22px 60px' }}>
        <div className="serif" style={{ fontSize: 28, letterSpacing: '.04em', fontWeight: 400 }}>
          TRAJE <span className="italic">esporte fino</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10, lineHeight: 1.6, maxWidth: 420 }}>
          {DRESS_REFERENCE_COPY}
        </div>

        <div style={{ marginTop: 28 }}>
          <div className="micro" style={{ color: 'var(--muted)' }}>
            PALETA SUGERIDA
          </div>
          <SwatchGrid swatches={SUGGESTED_SWATCHES} />
        </div>

        <div style={{ marginTop: 28 }}>
          <div className="micro" style={{ color: 'var(--muted)' }}>
            CORES QUE NÃO PODEM SER USADAS
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8, lineHeight: 1.6 }}>
            Todos os tons de vermelho, vinho e coral, além de branco e off-white.
          </div>
          <SwatchGrid swatches={FORBIDDEN_SWATCHES} />
        </div>

        <div
          style={{
            marginTop: 28,
            padding: '16px 18px',
            borderRadius: 12,
            background: 'rgba(196, 30, 58, 0.06)',
            border: '1px solid rgba(196, 30, 58, 0.12)',
          }}
        >
          <div className="micro" style={{ color: 'var(--muted)' }}>LEMBRETE</div>
          <p style={{ fontSize: 13, marginTop: 8, lineHeight: 1.55 }}>{FORBIDDEN_REMINDER}</p>
        </div>

        <div style={{ marginTop: 28 }}>
          <div className="micro" style={{ color: 'var(--muted)' }}>
            REFERÊNCIAS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
            {REFS.map((l) => (
              <Ph key={l} light label={l} aspect="3/4" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
