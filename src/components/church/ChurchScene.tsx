'use client';

import { useEffect, useRef } from 'react';

type Handle = { dispose: () => void };

export function ChurchScene() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let handle: Handle | null = null;
    let dead = false;

    import('./mountChurch').then(({ mountChurch }) => {
      if (dead || !ref.current) return;
      handle = mountChurch(ref.current);
    });

    return () => {
      dead = true;
      handle?.dispose();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
    />
  );
}
