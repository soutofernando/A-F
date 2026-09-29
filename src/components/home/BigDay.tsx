import { FieldBackdrop } from '@/components/FieldBackdrop';
import { DressCodeCard } from '@/components/home/DressCodeCard';
import { WatercolorChurchCard } from '@/components/home/WatercolorChurchCard';
import { RusticIcon, type RusticName } from '@/components/RusticIcon';

const FACTS: Array<{ k: string; v: string; detail?: string; icon: RusticName; tone: string; mapsQuery?: string }> = [
  { k: 'Dia', v: '28 de novembro', detail: 'sábado · 2026', icon: 'sun', tone: 'var(--dourado-esc)' },
  { k: 'Horário', v: '09:00', detail: 'pedimos pontualidade', icon: 'clock', tone: 'var(--azul)' },
  {
    k: 'Cerimônia',
    v: 'Sagrado Coração de Jesus',
    detail: 'Catolé · Campina Grande',
    icon: 'church',
    tone: 'var(--terracota)',
    mapsQuery: 'Igreja Sagrado Coração de Jesus, Campina Grande',
  },
  {
    k: 'Recepção',
    v: 'Sítio São José da Mata',
    detail: 'Rua Miguel Leão, 69',
    icon: 'olive',
    tone: 'var(--oliva-esc)',
    mapsQuery: 'Rua Miguel Leão, 69, São José da Mata',
  },
];

export function BigDay() {
  return (
    <section id="dia" className="has-field" style={{ padding: '72px 22px', background: 'var(--bg-alt)' }}>
      <FieldBackdrop tone="sky" />
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h2 className="serif" style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 'clamp(42px, 6vw, 68px)', color: 'var(--azul-profundo)', fontWeight: 400, lineHeight: 0.95 }}>
          <span style={{ color: 'var(--dourado-esc)' }}>
            <RusticIcon name="rings" size={36} />
          </span>
          O grande dia
        </h2>

        <div className="big-day-facts">
          {FACTS.map((fact) => (
            <article key={fact.k} className="big-day-fact">
              <div className="big-day-fact__head">
                <span className="big-day-fact__icon" style={{ color: fact.tone }}>
                  <RusticIcon name={fact.icon} size={18} />
                </span>
                <span className="big-day-fact__label">{fact.k}</span>
              </div>
              <p className="serif big-day-fact__value">{fact.v}</p>
              <div className="big-day-fact__foot">
                <p className="big-day-fact__detail">{fact.detail ?? '\u00a0'}</p>
                {fact.mapsQuery ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fact.mapsQuery)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="big-day-fact__link"
                  >
                    <RusticIcon name="gate" size={14} />
                    Como chegar
                  </a>
                ) : (
                  <span className="big-day-fact__link-slot" aria-hidden />
                )}
              </div>
            </article>
          ))}
        </div>

        <div className="big-day-bento">
          <article style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--linha)', minHeight: 260 }}>
            <WatercolorChurchCard minHeight={260}>
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(180deg, rgba(248,245,238,0.08) 0%, rgba(248,245,238,0) 38%, rgba(248,245,238,.9) 100%)',
                  pointerEvents: 'none',
                }}
              />
              <a
                href="https://www.google.com/maps/search/?api=1&query=Igreja+Sagrado+Cora%C3%A7%C3%A3o+de+Jesus"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ position: 'absolute', top: 14, left: 14, zIndex: 2 }}
              >
                <RusticIcon name="gate" size={16} />
                Como chegar
              </a>
              <p
                className="serif"
                style={{
                  position: 'absolute',
                  left: 14,
                  right: 14,
                  bottom: 14,
                  fontSize: 'clamp(20px, 3.5vw, 26px)',
                  color: 'var(--ink-blue)',
                  zIndex: 2,
                  textShadow: '0 1px 0 rgba(248, 245, 238, .85)',
                }}
              >
                Sagrado Coração de Jesus
              </p>
            </WatercolorChurchCard>
          </article>
          <DressCodeCard />
        </div>
      </div>
    </section>
  );
}
