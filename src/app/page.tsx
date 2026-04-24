'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Ph } from '@/components/Ph';
import { Reveal } from '@/components/Reveal';
import { WordReveal } from '@/components/WordReveal';
import { Countdown } from '@/components/Countdown';
import { Ornament } from '@/components/Ornament';
import { TornEdge } from '@/components/TornEdge';

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
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const on = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

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
          <Ph label="FOTO DO CASAL · ABRAÇO · 3:4" style={{ width: '100%', height: '100%' }} className="kb" />
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

        {/* Topbar */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            padding: '54px 20px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div className="italic" style={{ fontSize: 18, color: 'var(--cream)' }}>
            início
          </div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('openMenu'))}
            aria-label="Abrir menu"
            style={{ background: 'transparent', border: 0, color: 'var(--cream)', padding: 6, cursor: 'pointer' }}
          >
            <svg width="22" height="14" viewBox="0 0 22 14">
              <path d="M0 1H22M0 7H14M0 13H22" stroke="currentColor" strokeWidth="1" />
            </svg>
          </button>
        </div>

        {/* Names */}
        <div style={{ position: 'absolute', top: '24%', left: 0, right: 0, textAlign: 'center', zIndex: 2, padding: '0 18px' }}>
          <WordReveal
            as="div"
            text="ALICIA"
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
            text="FERNANDO"
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
                maxWidth: 260,
                margin: '16px auto 0',
              }}
            >
              — pelos olhares que não desviaram,
              <br /> até virarem destino.
            </div>
          </div>
        </div>

        {/* Countdown */}
        <div style={{ position: 'absolute', bottom: 28, left: 0, right: 0, zIndex: 2, padding: '0 12px' }}>
          <Countdown />
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
      <section style={{ background: 'var(--bone)', color: 'var(--ink)', padding: '44px 22px 60px', position: 'relative' }}>
        <Reveal>
          <div className="serif" style={{ fontSize: 72, lineHeight: 0.9, fontWeight: 300, letterSpacing: '.02em' }}>
            SAVE
            <br />
            THE
            <br />
            <span className="italic" style={{ color: 'var(--ink)', fontStyle: 'italic' }}>
              date!
            </span>
          </div>
        </Reveal>

        <Reveal delay={200}>
          <div
            style={{ display: 'flex', gap: 10, marginTop: 28, overflowX: 'auto', paddingBottom: 12 }}
            className="phone-scroll"
          >
            {[
              { n: '01', l: 'PEDIDO · CAMPESTRE' },
              { n: '02', l: 'ENSAIO · FAZENDA' },
              { n: '03', l: 'NOIVADO' },
            ].map((c) => (
              <div key={c.n} style={{ flex: '0 0 120px', position: 'relative' }}>
                <Ph
                  light
                  label={c.l}
                  style={{
                    width: 120,
                    height: 160,
                    borderRadius: '60px 60px 60px 60px / 80px 80px 80px 80px',
                  }}
                />
                <div
                  className="serif italic"
                  style={{ position: 'absolute', right: -4, bottom: -8, fontSize: 28, color: 'var(--ink)', opacity: 0.85 }}
                >
                  {c.n}.
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={400}>
          <div style={{ marginTop: 36 }}>
            <div className="micro" style={{ color: 'var(--muted)' }}>
              28 · 11 · 2026 · SÁBADO
            </div>
            <div className="hairline-dark" style={{ margin: '12px 0' }} />
            <div className="serif" style={{ fontSize: 22, lineHeight: 1.3, fontWeight: 400, maxWidth: 280 }}>
              Será uma honra receber você para celebrar a união de duas vidas que viraram uma.
            </div>
          </div>
        </Reveal>
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

        <div style={{ textAlign: 'center', marginTop: 40, opacity: 0.4 }}>
          <div className="italic" style={{ fontSize: 14 }}>
            A &amp; F
          </div>
          <div className="micro" style={{ fontSize: 8, marginTop: 6, color: 'rgba(239,231,219,.4)' }}>
            ALICIA &amp; FERNANDO · MMXXVI
          </div>
        </div>
      </section>
    </div>
  );
}
