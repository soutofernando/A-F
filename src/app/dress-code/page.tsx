'use client';

import { WordReveal } from '@/components/WordReveal';
import { Ph } from '@/components/Ph';

const PALETTE = [
  { c: '#EDE8D0', n: 'bege' },
  { c: '#BEB8A0', n: 'areia' },
  { c: '#5A564C', n: 'fumo' },
  { c: '#25221E', n: 'grafite' },
  { c: '#0A0908', n: 'ônix' },
];

const AVOID: Array<[string, string]> = [
  ['✕', 'branco, off-white ou marfim — cores da noiva'],
  ['✕', 'roupas esportivas, jeans ou tênis esportivo'],
  ['✕', 'vermelho vibrante ou neons'],
];

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
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10, lineHeight: 1.6, maxWidth: 360 }}>
          pedimos um traje que combine com a elegância simples do dia — sem peso, sem rigidez, apenas beleza honesta.
        </div>

        <div style={{ marginTop: 28 }}>
          <div className="micro" style={{ color: 'var(--muted)' }}>
            PALETA SUGERIDA
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            {PALETTE.map((s) => (
              <div key={s.n} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ aspectRatio: '1', background: s.c, border: '1px solid rgba(14,11,9,.1)' }} />
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
                  {s.n}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 28 }}>
          <div className="micro" style={{ color: 'var(--muted)' }}>
            EVITE, POR FAVOR
          </div>
          <div className="hairline-dark" style={{ marginTop: 8 }} />
          {AVOID.map(([k, v], i) => (
            <div
              key={i}
              style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(14,11,9,.08)' }}
            >
              <div className="serif" style={{ fontSize: 16 }}>
                {k}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontFamily: 'var(--font-inter)',
                  fontWeight: 300,
                  lineHeight: 1.5,
                }}
              >
                {v}
              </div>
            </div>
          ))}
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
