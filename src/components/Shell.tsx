'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { MenuOverlay } from './MenuOverlay';
import { StickyNav } from './StickyNav';
import { Footer } from './Footer';
import { SmoothScroll } from './SmoothScroll';

export function Shell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onOpen = () => setMenuOpen(true);
    window.addEventListener('openMenu', onOpen);
    return () => window.removeEventListener('openMenu', onOpen);
  }, []);

  useEffect(() => {
    document.body.classList.remove('scene-cut');
  }, [pathname]);

  // /admin tem seu próprio chrome.
  if (pathname?.startsWith('/admin')) {
    return <>{children}</>;
  }

  const hideFooter =
    pathname === '/despensa' ||
    pathname?.startsWith('/despensa/') ||
    pathname === '/despesas' ||
    pathname?.startsWith('/despesas/');

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="paper-grain" aria-hidden />
      <SmoothScroll />
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
        <filter id="watercolor">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="20" />
        </filter>
      </svg>
      <StickyNav onMenu={() => setMenuOpen(true)} />
      {children}
      {!hideFooter && <Footer />}
      <MenuOverlay open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
