'use client';

import { WordReveal } from '@/components/WordReveal';
import { Ph } from '@/components/Ph';
import { Btn } from '@/components/Btn';
import { TornEdge } from '@/components/TornEdge';

const SCHEDULE: Array<[string, string]> = [
  ['09:00', 'CERIMÔNIA · IGREJA'],
  ['10:30', 'TRANSFER AO SÍTIO'],
  ['11:00', 'RECEPÇÃO E BRINDE'],
  ['12:30', 'ALMOÇO'],
  ['15:00', 'CORTE DO BOLO'],
  ['16:00', 'PISTA LIVRE'],
];

export default function CerimoniaPage() {
  return (
    <div>
      {/* Parte clara: cerimônia */}
      <section
        data-theme="light"
        style={{ background: 'var(--bone)', color: 'var(--ink)' }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '120px 22px 8px' }}>
          <div className="micro" style={{ color: 'var(--muted)' }}>
            CAPÍTULO III
          </div>
          <WordReveal
            as="div"
            text="a cerimônia"
            stagger={80}
            className="serif italic"
            style={{ fontSize: 46, lineHeight: 1, marginTop: 8, color: 'var(--ink)' }}
          />
        </div>

        <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 22px 40px' }}>
          <Ph light label="IGREJA · FACHADA · 4:3" aspect="4/3" />
          <div style={{ marginTop: 20 }}>
            <div className="micro" style={{ color: 'var(--muted)' }}>
              CERIMÔNIA · 09:00
            </div>
            <div className="serif" style={{ fontSize: 32, fontWeight: 400, marginTop: 6, lineHeight: 1.05 }}>
              Sagrado Coração
              <br />
              <span className="italic">de Jesus</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10, lineHeight: 1.6 }}>
              sábado · 28 de novembro de 2026
              <br />
              pedimos a gentileza de chegar com 30 minutos de antecedência.
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Btn variant="ghost" small>
                COMO CHEGAR
              </Btn>
              <Btn variant="ghost" small>
                ADICIONAR AO CALENDÁRIO
              </Btn>
            </div>
          </div>
        </div>
      </section>

      <TornEdge from="var(--bone)" to="#0E0B09" position="bottom" />

      {/* Parte escura: recepção */}
      <section style={{ background: 'var(--ink)', color: 'var(--cream)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '30px 22px 60px' }}>
          <Ph label="SÍTIO · ÁRVORES · NOITE" aspect="4/3" />
          <div style={{ marginTop: 20 }}>
            <div className="micro" style={{ color: 'var(--gold-soft)' }}>
              RECEPÇÃO · 11:00
            </div>
            <div
              className="serif"
              style={{ fontSize: 32, fontWeight: 400, marginTop: 6, lineHeight: 1.05, color: 'var(--cream)' }}
            >
              Sítio <span className="italic" style={{ color: 'var(--gold)' }}>São José</span>
              <br />
              da Mata
            </div>
            <div style={{ fontSize: 13, color: 'rgba(239,231,219,.65)', marginTop: 10, lineHeight: 1.6 }}>
              almoço, festa e dança até cair a noite.
              <br />
              transfer saindo da igreja às 10h30.
            </div>

            <div
              style={{
                marginTop: 20,
                padding: '16px 0',
                borderTop: '1px solid rgba(239,231,219,.12)',
                borderBottom: '1px solid rgba(239,231,219,.12)',
              }}
            >
              {SCHEDULE.map(([h, t]) => (
                <div key={h} style={{ display: 'flex', alignItems: 'baseline', gap: 16, padding: '8px 0' }}>
                  <div className="serif" style={{ fontSize: 20, color: 'var(--gold-soft)', minWidth: 60 }}>
                    {h}
                  </div>
                  <div className="micro" style={{ fontSize: 10, color: 'rgba(239,231,219,.8)' }}>
                    {t}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20 }}>
              <div className="micro" style={{ color: 'var(--gold-soft)', marginBottom: 8 }}>
                LOCALIZAÇÃO
              </div>
              <div
                style={{
                  position: 'relative',
                  height: 180,
                  background: 'linear-gradient(135deg, #151210 0%, #211d18 100%)',
                  overflow: 'hidden',
                  border: '1px solid rgba(237,232,208,.2)',
                }}
              >
                <svg
                  viewBox="0 0 300 180"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.4 }}
                  preserveAspectRatio="none"
                >
                  <path d="M0 90 Q50 70 100 85 T200 80 T300 95" stroke="#EDE8D0" fill="none" strokeWidth=".5" />
                  <path d="M0 110 Q60 100 120 115 T240 105 T300 120" stroke="#EDE8D0" fill="none" strokeWidth=".5" />
                  <path d="M40 0 L50 180" stroke="#EDE8D0" fill="none" strokeWidth=".3" />
                  <path d="M160 0 L170 180" stroke="#EDE8D0" fill="none" strokeWidth=".3" />
                </svg>
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%,-50%)',
                    textAlign: 'center',
                  }}
                >
                  <svg width="28" height="36" viewBox="0 0 28 36">
                    <path
                      d="M14 0 C6 0 0 6 0 14 C0 24 14 36 14 36 C14 36 28 24 28 14 C28 6 22 0 14 0 Z M14 19 A5 5 0 1 1 14 9 A5 5 0 0 1 14 19Z"
                      fill="#EDE8D0"
                    />
                  </svg>
                  <div className="mono" style={{ fontSize: 9, marginTop: 4, color: 'var(--gold-soft)' }}>
                    SÍTIO SÃO JOSÉ
                  </div>
                </div>
              </div>
              <Btn small variant="gold" style={{ marginTop: 12 }}>
                ABRIR NO MAPS
              </Btn>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
