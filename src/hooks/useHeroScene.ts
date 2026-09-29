'use client';

import { useEffect, useLayoutEffect, useState } from 'react';

type NetworkInfo = { saveData?: boolean };

export function isQuietDevice() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: NetworkInfo };
  if (nav.connection?.saveData) return true;
  if ((nav.deviceMemory ?? 8) <= 2) return true;
  if ((navigator.hardwareConcurrency ?? 8) <= 2) return true;
  return false;
}

export function useHeroScene() {
  const [paint, setPaint] = useState(false);
  const [shift, setShift] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    if (isQuietDevice()) return;
    try {
      const probe = document.createElement('canvas');
      setPaint(Boolean(probe.getContext('webgl2') || probe.getContext('webgl')));
    } catch {
      setPaint(false);
    }
  }, []);

  useEffect(() => {
    if (paint || isQuietDevice()) return;
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      setShift({
        x: event.clientX / window.innerWidth - 0.5,
        y: event.clientY / window.innerHeight - 0.5,
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [paint]);

  return { paint, shift };
}
