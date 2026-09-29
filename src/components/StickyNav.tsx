'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';

const NAV: Array<[string, string]> = [
  ['/#historia', 'história'],
  ['/#dia', 'o grande dia'],
  ['/#confirmar', 'presença'],
  ['/presentes', 'presentes'],
  ['/#album', 'álbum'],
  ['/#recados', 'recados'],
];

type Props = { onMenu: () => void };

export function StickyNav({ onMenu }: Props) {
  const pathname = usePathname();
  const menuless =
    pathname === '/despensa' ||
    pathname?.startsWith('/despensa/') ||
    pathname === '/despesas' ||
    pathname?.startsWith('/despesas/');
  const [active, setActive] = useState('');
  const [solid, setSolid] = useState(pathname !== '/');
  const onHome = pathname === '/';

  useEffect(() => {
    if (!onHome) {
      setSolid(true);
      return;
    }
    const onScroll = () => setSolid(window.scrollY > 28);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [onHome]);

  useEffect(() => {
    if (!onHome) {
      setActive('');
      return;
    }

    const nodes = NAV.map(([href]) => document.getElementById(href.replace('/#', ''))).filter(
      (node): node is HTMLElement => Boolean(node),
    );
    if (!nodes.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0.15, 0.4] },
    );
    nodes.forEach((node) => io.observe(node));
    return () => io.disconnect();
  }, [onHome]);

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 80,
        color: 'var(--ink-blue)',
        background: solid ? 'rgba(248, 245, 238, 0.88)' : 'transparent',
        backdropFilter: solid ? 'blur(16px)' : 'none',
        WebkitBackdropFilter: solid ? 'blur(16px)' : 'none',
        borderBottom: solid ? '1px solid rgba(213, 220, 230, .85)' : '1px solid transparent',
        transition: 'background .35s ease, border-color .35s ease',
        textShadow: solid ? 'none' : '0 1px 0 rgba(248, 245, 238, .92)',
      }}
    >
      <div
        className="nav-row"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          padding: '14px 22px',
          maxWidth: 1280,
          margin: '0 auto',
        }}
      >
        <Link href="/" aria-label="Alicia & Fernando" style={{ color: 'inherit', textDecoration: 'none', flexShrink: 0 }}>
          <Logo height={34} priority />
        </Link>

        {!menuless && (
          <nav className="nav-desktop" style={{ display: 'none', gap: 28, alignItems: 'center' }}>
            {NAV.map(([href, label]) => {
              const id = href.startsWith('/#') ? href.slice(2) : '';
              const on = id ? onHome && active === id : pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className="micro"
                  style={{
                    color: 'inherit',
                    textDecoration: 'none',
                    fontSize: 12,
                    paddingBottom: 4,
                    borderBottom: on ? '1px solid var(--dourado)' : '1px solid transparent',
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        )}

        {!menuless && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href="/#confirmar" className="btn btn-primary btn-sm nav-cta">
              Confirmar presença
            </Link>
            <button
              onClick={onMenu}
              aria-label="Abrir menu"
              className="nav-burger"
              style={{ background: 'transparent', border: 0, padding: 8, cursor: 'pointer', color: 'inherit' }}
            >
              <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden>
                <path d="M0 1H22M0 7H14M0 13H22" stroke="currentColor" strokeWidth="1" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @media (min-width: 980px) {
          .nav-desktop {
            display: flex !important;
          }
          .nav-burger {
            display: none;
          }
        }
      `}</style>
    </header>
  );
}
