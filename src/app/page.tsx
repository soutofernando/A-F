'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Ph } from '@/components/Ph';
import { Reveal } from '@/components/Reveal';
import { WordReveal } from '@/components/WordReveal';
import { Countdown } from '@/components/Countdown';
import { Ornament } from '@/components/Ornament';
import { TornEdge } from '@/components/TornEdge';
import { Btn } from '@/components/Btn';
import { Logo } from '@/components/Logo';
import { createClient } from '@/lib/supabase/client';

type SiteConfig = {
  coupleNames: string;
  heroSubtitle: string;
  weddingDate: string | null;
  heroImageUrl: string | null;
};

const DEFAULTS: SiteConfig = {
  coupleNames: 'Alicia & Fernando',
  heroSubtitle: '— pelos olhares que não desviaram, até virarem destino.',
  weddingDate: null,
  heroImageUrl: null,
};

const QUICK_NAV: Array<{ href: string; t: string; s: string }> = [
  { href: '/rsvp', t: 'Confirme sua presença', s: 'busque seu nome na lista' },
  { href: '/historia', t: 'Nossa história', s: 'de um olhar até o sim' },
  { href: '/cerimonia', t: 'A cerimônia', s: 'sagrado coração de jesus' },
  { href: '/album', t: 'Álbum de fotos', s: 'os dias que nos trouxeram aqui' },
  { href: '/presentes', t: 'Lista de presentes', s: 'sua presença já é um presente' },
  { href: '/dress-code', t: 'Código de vestimenta', s: 'traje esporte fino' },
  { href: '/mensagens', t: 'Recados dos convidados', s: 'deixe uma palavra para nós' },
];

export default function HomePage() {
  const router = useRouter();
  const [scrollY, setScrollY] = useState(0);
  const [config, setConfig] = useState<SiteConfig>(DEFAULTS);

  useEffect(() => {
    const on = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const [{ data: cfg }, { data: imgs }] = await Promise.all([
        supabase.from('config').select('key, value'),
        supabase
          .from('images')
          .select('storage_path')
          .eq('context', 'hero')
          .order('display_order')
          .limit(1),
      ]);
      const map = new Map<string, string>();
      (cfg ?? []).forEach((c: { key: string; value: string | null }) => map.set(c.key, c.value ?? ''));
      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
      const heroPath = imgs?.[0]?.storage_path;
      setConfig({
        coupleNames: map.get('couple_names') || DEFAULTS.coupleNames,
        heroSubtitle: map.get('hero_subtitle') || DEFAULTS.heroSubtitle,
        weddingDate: map.get('wedding_date') || null,
        heroImageUrl: heroPath ? `${baseUrl}/storage/v1/object/public/photos/${heroPath}` : null,
      });
    })();
  }, []);

  const [name1, name2] = useMemo(() => {
    const parts = config.coupleNames.split(/\s*&\s*/).filter(Boolean);
    const a = (parts[0] ?? 'Alicia').toUpperCase();
    const b = (parts[1] ?? 'Fernando').toUpperCase();
    return [a, b] as const;
  }, [config.coupleNames]);

  const weddingTimestamp = useMemo(() => {
    if (!config.weddingDate) return undefined;
    const t = new Date(config.weddingDate).getTime();
    return Number.isFinite(t) ? t : undefined;
  }, [config.weddingDate]);

  const weddingLine = useMemo(() => {
    if (!config.weddingDate) return '28 · 11 · 2026 · SÁBADO';
    try {
      const d = new Date(config.weddingDate);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      const weekday = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'][d.getDay()];
      return `${dd} · ${mm} · ${yyyy} · ${weekday}`;
    } catch {
      return '28 · 11 · 2026 · SÁBADO';
    }
  }, [config.weddingDate]);

  return (
    <div data-scrollroot style={{ background: '#0E0B09', color: 'var(--cream)', position: 'relative' }}>
      {/* Hero */}
      <section style={{ position: 'relative', height: 'min(100vh, 800px)', minHeight: 640, overflow: 'hidden' }}>
        {/* Parallax photo */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `translateY(${scrollY * 0.4}px) scale(1.1)`,
            transition: 'transform .05s linear',
          }}
        >
          {config.heroImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={config.heroImageUrl}
              alt={config.coupleNames}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div
              aria-hidden
              style={{
                width: '100%',
                height: '100%',
                background:
                  'radial-gradient(ellipse at 50% 30%, #2a1f17 0%, #14100d 60%, #0E0B09 100%)',
              }}
            />
          )}
        </div>

        {/* Vignette */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(14,11,9,.55) 0%, rgba(14,11,9,.15) 40%, rgba(14,11,9,.85) 100%)',
          }}
        />

        {/* Names */}
        <div style={{ position: 'absolute', top: '24%', left: 0, right: 0, textAlign: 'center', zIndex: 2, padding: '0 18px' }}>
          <div className="fade-up" style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
            <Logo height={64} priority style={{ opacity: 0.95 }} />
          </div>
          <WordReveal
            as="div"
            text={name1}
            stagger={0}
            delay={100}
            className="serif"
            style={{ fontSize: 52, lineHeight: 0.95, letterSpacing: '.04em', fontWeight: 300 }}
          />
          <div className="italic" style={{ fontSize: 28, margin: '-4px 0', color: 'var(--gold-soft)' }}>
            &amp;
          </div>
          <WordReveal
            as="div"
            text={name2}
            stagger={0}
            delay={400}
            className="serif"
            style={{ fontSize: 52, lineHeight: 0.95, letterSpacing: '.04em', fontWeight: 300 }}
          />

          <div style={{ marginTop: 22, display: 'flex', justifyContent: 'center' }}>
            <Ornament />
          </div>

          <div className="fade-up" style={{ animationDelay: '1.1s', animationFillMode: 'both' }}>
            <div
              className="italic"
              style={{
                marginTop: 16,
                fontSize: 14,
                color: 'rgba(239,231,219,.75)',
                lineHeight: 1.5,
                maxWidth: 280,
                margin: '16px auto 0',
              }}
            >
              {config.heroSubtitle}
            </div>
          </div>
        </div>

        {/* Countdown */}
        <div style={{ position: 'absolute', bottom: 28, left: 0, right: 0, zIndex: 2, padding: '0 12px' }}>
          <Countdown target={weddingTimestamp} />
          <div
            className="micro pulse"
            style={{ textAlign: 'center', marginTop: 18, color: 'rgba(239,231,219,.6)', fontSize: 9, letterSpacing: '.3em' }}
          >
            ↓ DESLIZE
          </div>
        </div>
      </section>

      {/* Torn transition into bone */}
      <TornEdge from="#0E0B09" to="var(--bone)" position="top" />

      {/* Save the date */}
      <section
        data-theme="light"
        className="std-section"
        style={{
          background: 'var(--bone)',
          color: 'var(--ink)',
          padding: '100px 28px 120px',
          position: 'relative',
        }}
      >
        <div className="std-grid">
          {/* Coluna esquerda: título + CTA */}
          <div className="std-col-left">
            <Reveal>
              <h2
                className="serif std-title"
                style={{ lineHeight: 0.85, fontWeight: 300, letterSpacing: '.01em', margin: 0 }}
              >
                SAVE
                <br />
                THE
                <br />
                <span className="italic" style={{ fontStyle: 'italic' }}>
                  date!
                </span>
              </h2>
            </Reveal>

            <Reveal delay={300}>
              <div style={{ marginTop: 56, display: 'flex', gap: 18, alignItems: 'center' }}>
                <Logo height={52} style={{ opacity: 0.85 }} />
                <Btn variant="ghost" small onClick={() => router.push('/rsvp')}>
                  Confirme sua presença
                </Btn>
              </div>
            </Reveal>
          </div>

          {/* Coluna direita: 3 fotos em arco */}
          <div className="std-photos">
            {[
              { n: '01', l: 'O COMEÇO', date: '10 ABR 2018', ph: 'ABRAÇO · PEDIDO · CAMPESTRE' },
              { n: '02', l: 'O PEDIDO', date: '18 NOV 2023', ph: 'ENSAIO · FAZENDA' },
              { n: '03', l: 'O CASAMENTO', date: '28 NOV 2026', ph: 'NOIVADO' },
            ].map((c, i) => (
              <Reveal key={c.n} delay={200 + i * 120} className="std-photo-col">
                <div style={{ position: 'relative' }}>
                  <div
                    className="std-arch"
                    style={{
                      position: 'relative',
                      overflow: 'hidden',
                      borderRadius: '50% 50% 14px 14px / 32% 32% 8px 8px',
                    }}
                  >
                    <Ph light label={c.ph} style={{ width: '100%', height: '100%' }} />
                  </div>
                  <div
                    className="serif italic"
                    style={{
                      position: 'absolute',
                      right: -6,
                      bottom: -20,
                      fontSize: 56,
                      fontWeight: 300,
                      color: 'var(--ink)',
                      opacity: 0.88,
                      lineHeight: 1,
                    }}
                  >
                    {c.n}.
                  </div>
                </div>
                <div style={{ textAlign: 'center', marginTop: 40, padding: '0 6px' }}>
                  <div
                    className="hairline-dark"
                    style={{ width: 1, height: 28, margin: '0 auto', background: 'rgba(14,11,9,.25)' }}
                  />
                  <div className="mono" style={{ fontSize: 9, color: 'var(--muted)', marginTop: 14 }}>
                    {c.date}
                  </div>
                  <div
                    className="serif"
                    style={{
                      fontSize: 22,
                      fontWeight: 400,
                      letterSpacing: '.05em',
                      marginTop: 6,
                      textTransform: 'uppercase',
                    }}
                  >
                    {c.l}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="std-swipe-hint" aria-hidden>
          ← deslize →
        </div>

        {/* Linha inferior: data + frase */}
        <Reveal delay={600}>
          <div style={{ maxWidth: 1280, margin: '96px auto 0' }}>
            <div className="micro" style={{ color: 'var(--muted)' }}>
              {weddingLine}
            </div>
            <div className="hairline-dark" style={{ margin: '14px 0' }} />
            <div
              className="serif"
              style={{ fontSize: 24, lineHeight: 1.4, fontWeight: 400, maxWidth: 560 }}
            >
              Será uma honra receber você para celebrar a união de duas vidas que viraram uma.
            </div>
          </div>
        </Reveal>

        <style jsx>{`
          .std-grid {
            max-width: 1280px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: 1fr;
            gap: 80px;
            align-items: start;
          }
          .std-title {
            font-size: clamp(64px, 10vw, 140px);
          }
          /* Mobile: slider horizontal com snap */
          .std-photos {
            display: flex;
            gap: 16px;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            padding: 4px 28px 32px;
            margin: 0 -28px;
            scroll-padding: 0 28px;
          }
          .std-photos::-webkit-scrollbar {
            display: none;
          }
          .std-photos > :global(.std-photo-col) {
            flex: 0 0 78%;
            scroll-snap-align: center;
            scroll-snap-stop: always;
            min-width: 0;
          }
          .std-arch {
            aspect-ratio: 1 / 2.1;
            width: 100%;
          }
          /* Hint sutil de "deslize" no mobile */
          .std-swipe-hint {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-top: -16px;
            font-family: var(--font-inter), sans-serif;
            font-size: 9px;
            letter-spacing: .3em;
            color: rgba(14, 11, 9, .35);
            text-transform: uppercase;
          }
          @media (min-width: 720px) {
            /* Desktop: volta pro grid de 3 colunas */
            .std-photos {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 24px;
              overflow: visible;
              scroll-snap-type: none;
              padding: 0;
              margin: 0;
            }
            .std-photos > :global(.std-photo-col) {
              flex: initial;
              scroll-snap-align: none;
            }
            .std-swipe-hint {
              display: none;
            }
          }
          @media (min-width: 900px) {
            .std-grid {
              grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
              gap: 100px;
            }
            .std-col-left {
              position: sticky;
              top: 120px;
            }
            .std-photos {
              gap: 28px;
            }
          }
        `}</style>
      </section>

      {/* Quick nav */}
      <section style={{ background: 'var(--ink)', padding: '48px 20px 60px' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div className="micro" style={{ color: 'var(--gold-soft)' }}>
            · EXPLORE ·
          </div>
          <div className="serif" style={{ fontSize: 32, marginTop: 8, letterSpacing: '.04em' }}>
            onde começar?
          </div>
        </div>

        {QUICK_NAV.map((c, i) => (
          <Reveal key={c.href} delay={i * 80}>
            <Link
              href={c.href}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'transparent',
                border: 0,
                borderTop: '1px solid rgba(239,231,219,.12)',
                padding: '18px 2px',
                textDecoration: 'none',
                color: 'var(--cream)',
              }}
            >
              <div>
                <div className="serif" style={{ fontSize: 22, fontWeight: 400, letterSpacing: '.01em' }}>
                  {c.t}
                </div>
                <div className="italic" style={{ fontSize: 12, color: 'rgba(239,231,219,.5)', marginTop: 2 }}>
                  {c.s}
                </div>
              </div>
              <div className="micro" style={{ color: 'var(--gold-soft)' }}>
                →
              </div>
            </Link>
          </Reveal>
        ))}

        <div style={{ textAlign: 'center', marginTop: 40, opacity: 0.55 }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Logo height={44} style={{ opacity: 0.75 }} />
          </div>
          <div className="micro" style={{ fontSize: 8, marginTop: 12, color: 'rgba(239,231,219,.4)' }}>
            ALICIA &amp; FERNANDO · MMXXVI
          </div>
        </div>
      </section>
    </div>
  );
}
