'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { MenuOverlay } from './MenuOverlay';
import { TopBar } from './TopBar';

export function Shell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setMenuOpen(true);
    window.addEventListener('openMenu', onOpen);
    return () => window.removeEventListener('openMenu', onOpen);
  }, []);

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#0E0B09' }}>
      <TopBar onMenu={() => setMenuOpen(true)} />
      {children}
      <MenuOverlay open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
