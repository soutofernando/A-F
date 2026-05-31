'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { MenuOverlay } from './MenuOverlay';
import { StickyNav } from './StickyNav';
import { Footer } from './Footer';

export function Shell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onOpen = () => setMenuOpen(true);
    window.addEventListener('openMenu', onOpen);
    return () => window.removeEventListener('openMenu', onOpen);
  }, []);

  // /admin tem seu próprio chrome.
  if (pathname?.startsWith('/admin')) {
    return <>{children}</>;
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#0E0B09' }}>
      <StickyNav onMenu={() => setMenuOpen(true)} />
      {children}
      <Footer />
      <MenuOverlay open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
