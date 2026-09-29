import { FieldBackdrop } from '@/components/FieldBackdrop';
import { RusticIcon, type RusticName } from '@/components/RusticIcon';

const BEATS: Array<{ n: string; title: string; date: string; label: string; icon: RusticName }> = [
  { n: '01', title: 'O Começo', date: '10 ABR 2018', label: 'ABRAÇO · PEDIDO · CAMPESTRE', icon: 'olive' },
  { n: '02', title: 'O Pedido', date: '18 NOV 2023', label: 'ENSAIO · FAZENDA', icon: 'rings' },
  { n: '03', title: 'O Casamento', date: '28 NOV 2026', label: 'NOIVADO', icon: 'church' },
];

export function StoryBand() {
  return (
    <section id="historia" className="has-field" style={{ padding: '88px 22px', maxWidth: 1100, margin: '0 auto' }}>
      <FieldBackdrop tone="leaf" />
        <h2 className="serif" style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 'clamp(42px, 6vw, 68px)', color: 'var(--azul-profundo)', fontWeight: 400, lineHeight: 0.95 }}>
          <span style={{ color: 'var(--terracota)' }}>
            <RusticIcon name="church" size={32} />
          </span>
          Nossa história
        </h2>
      <div style={{ marginTop: 12 }}>
        <svg width="120" height="14" viewBox="0 0 120 14" aria-hidden>
          <path className="brush" d="M2 8 C 30 2, 50 12, 118 6" fill="none" stroke="var(--dourado)" strokeWidth="1.2" />
        </svg>
      </div>

      <div style={{ position: 'relative', marginTop: 48 }}>
        <svg
          viewBox="0 0 20 100"
          preserveAspectRatio="none"
          aria-hidden
          style={{ position: 'absolute', left: 18, top: 0, bottom: 0, width: 24, height: '100%' }}
        >
          <path className="brush" d="M10 0 C 4 20, 16 40, 10 60 C 4 78, 16 90, 10 100" fill="none" stroke="var(--terracota)" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <ol style={{ listStyle: 'none', display: 'grid', gap: 48, margin: 0, padding: 0 }}>
          {BEATS.map((beat) => (
            <li key={beat.n} style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: 18, alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: 'var(--oliva-esc)' }}>
                <RusticIcon name={beat.icon} size={26} />
                <span className="serif" style={{ color: 'var(--dourado-esc)', fontSize: 18 }}>
                  {beat.n}
                </span>
              </div>
              <div className="story-copy" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 160px) 1fr', gap: 18, alignItems: 'center' }}>
                <div className="arch arch-reveal ph wood-frame" style={{ aspectRatio: '3 / 4' }}>
                  <div className="ph-label">{beat.label}</div>
                </div>
                <div>
                  <div className="micro" style={{ color: 'var(--texto-suave)' }}>
                    {beat.date}
                  </div>
                  <h3 className="serif reveal-line" style={{ fontSize: 36, fontWeight: 400, color: 'var(--ink-blue)', marginTop: 4 }}>
                    {beat.title}
                  </h3>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <style jsx>{`
        @media (max-width: 640px) {
          .story-copy {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
