'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';

const NAV: Array<[string, string]> = [
  ['/', 'início'],
  ['/rsvp', 'confirme presença'],
  ['/presentes', 'presentes'],
  ['/cerimonia', 'cerimônia'],
  ['/album', 'álbum de fotos'],
  ['/historia', 'nossa história'],
];

type Props = { onMenu: () => void };

export function StickyNav({ onMenu }: Props) {
  const pathname = usePathname();
  // TEMP: em /confirmar mostra só o monograma, sem menu (remover esta linha no futuro)
  const menuless = pathname === '/confirmar';
  const [onLight, setOnLight] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-theme="light"]'));
    if (!targets.length) {
      setOnLight(false);
      return;
    }
    // Linha de detecção: 40px abaixo do topo (meio da navbar)
    const io = new IntersectionObserver(
      (entries) => {
        // Se qualquer seção clara estiver cruzando a linha da navbar, vira light.
        const anyLight = entries.some((e) => e.isIntersecting);
        setOnLight(anyLight);
      },
      { rootMargin: '-40px 0px -100% 0px', threshold: 0 },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, [pathname]);

  const textColor = onLight ? 'var(--ink)' : 'var(--cream)';
  const bg = scrolled
    ? onLight
      ? 'rgba(237,232,208,.82)'
      : 'rgba(14,11,9,.55)'
    : 'transparent';
  const border = onLight ? 'rgba(14,11,9,.1)' : 'rgba(239,231,219,.08)';

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        color: textColor,
        background: bg,
        backdropFilter: scrolled ? 'blur(10px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(10px)' : 'none',
        borderBottom: scrolled ? `1px solid ${border}` : '1px solid transparent',
        transition:
          'color .4s ease, background .4s ease, border-color .4s ease, backdrop-filter .4s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '18px 28px',
          maxWidth: 1400,
          margin: '0 auto',
        }}
      >
        {/* Monogram */}
        <Link href="/" aria-label="Alicia & Fernando" style={{ color: 'inherit', textDecoration: 'none', flexShrink: 0 }}>
          <Logo height={36} priority style={{ opacity: 0.92 }} />
        </Link>

        {/* Desktop nav */}
        {!menuless && (
        <nav className="nav-desktop" style={{ display: 'none', gap: 36, alignItems: 'center' }}>
          {NAV.map(([href, label]) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={active ? 'italic' : 'micro'}
                style={{
                  color: 'inherit',
                  textDecoration: 'none',
                  fontSize: active ? 18 : 10,
                  letterSpacing: active ? '.02em' : '.24em',
                  fontStyle: active ? 'italic' : 'normal',
                  textTransform: active ? 'none' : 'uppercase',
                  whiteSpace: 'nowrap',
                  transition: 'opacity .3s',
                  opacity: active ? 1 : 0.85,
                }}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        )}

        {/* Hamburger (mobile + sempre disponível pra ver todas as 8 seções) */}
        {!menuless && (
        <button
          onClick={onMenu}
          aria-label="Abrir menu"
          style={{
            background: 'transparent',
            border: 0,
            padding: 8,
            cursor: 'pointer',
            color: 'inherit',
            flexShrink: 0,
          }}
        >
          <svg width="22" height="14" viewBox="0 0 22 14">
            <path d="M0 1H22M0 7H14M0 13H22" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
        )}
      </div>

      <style jsx>{`
        @media (min-width: 900px) {
          .nav-desktop {
            display: flex !important;
          }
        }
      `}</style>
    </header>
  );
}
