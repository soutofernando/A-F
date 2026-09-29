import Link from 'next/link';
import { FieldBackdrop } from '@/components/FieldBackdrop';
import { WatercolorChurchCard } from '@/components/home/WatercolorChurchCard';
import { RusticIcon, type RusticName } from '@/components/RusticIcon';

const FACTS: Array<{ k: string; v: string; detail: string; icon: RusticName; tone: string }> = [
  { k: 'Dia', v: 'sábado', detail: '28 de novembro de 2026', icon: 'sun', tone: 'var(--dourado-esc)' },
  { k: 'Horário', v: '09:00', detail: 'pedimos a gentileza de chegar com 30 minutos de antecedência.', icon: 'clock', tone: 'var(--azul)' },
  { k: 'Cerimônia', v: 'Sagrado Coração de Jesus', detail: 'sábado · 28 de novembro de 2026', icon: 'church', tone: 'var(--terracota)' },
  { k: 'Recepção', v: 'Sítio São José da Mata', detail: 'almoço, festa e dança até cair a noite. transfer saindo da igreja às 10h30.', icon: 'olive', tone: 'var(--oliva-esc)' },
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
        <div
          style={{
            marginTop: 32,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 14,
          }}
        >
          {FACTS.map((fact) => (
            <article
              key={fact.k}
              style={{ background: 'var(--surface)', border: '1px solid var(--linha)', borderRadius: 20, padding: '20px 18px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div className="micro" style={{ color: 'var(--texto-suave)' }}>
                  {fact.k}
                </div>
                <span className="medallion" style={{ width: 52, height: 52, color: fact.tone, background: 'var(--bg-alt)' }}>
                  <RusticIcon name={fact.icon} size={28} />
                </span>
              </div>
              <p className="serif" style={{ fontSize: fact.k === 'Horário' || fact.k === 'Dia' ? 40 : 28, color: 'var(--azul-profundo)', lineHeight: 1.05, marginTop: 8 }}>
                {fact.v}
              </p>
              <p style={{ marginTop: 8, color: 'var(--texto-suave)', fontSize: 16 }}>{fact.detail}</p>
            </article>
          ))}
        </div>

        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
          <article style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid var(--linha)' }}>
            <WatercolorChurchCard minHeight={320}>
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
                style={{ position: 'absolute', top: 16, left: 16, zIndex: 2 }}
              >
                <RusticIcon name="gate" size={16} />
                Como chegar
              </a>
              <p
                className="serif"
                style={{
                  position: 'absolute',
                  left: 16,
                  right: 16,
                  bottom: 16,
                  fontSize: 'clamp(22px, 4vw, 28px)',
                  color: 'var(--ink-blue)',
                  zIndex: 2,
                  textShadow: '0 1px 0 rgba(248, 245, 238, .85)',
                }}
              >
                Sagrado Coração de Jesus
              </p>
            </WatercolorChurchCard>
          </article>
          <article style={{ background: 'var(--surface)', border: '1px solid var(--linha)', borderRadius: 20, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--madeira)' }}>
              <RusticIcon name="dress" size={26} />
              <span className="micro" style={{ color: 'var(--texto-suave)' }}>
                Código de vestimenta
              </span>
            </div>
            <p className="serif" style={{ fontSize: 32, color: 'var(--azul-profundo)', marginTop: 8 }}>
              Traje <span className="italic">esporte fino</span>
            </p>
            <Link href="/dress-code" className="btn btn-secondary btn-sm" style={{ marginTop: 16 }}>
              Ver referências
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}
