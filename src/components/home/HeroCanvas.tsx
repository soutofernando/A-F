'use client';

import { useEffect, useRef } from 'react';
import type { mountHero } from './mountHero';

type Handle = ReturnType<typeof mountHero>;

type Props = { compact?: boolean };

export function HeroCanvas({ compact = false }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let handle: Handle | null = null;
    let dead = false;

    const mobile = window.matchMedia('(max-width: 767px)').matches;
    import('./mountHero').then(({ mountHero: mount }) => {
      if (dead || !ref.current) return;
      handle = mount(ref.current, mobile, { compact });
    });

    const onRsvp = (event: Event) => {
      const detail = (event as CustomEvent).detail as { status?: string } | undefined;
      if (detail?.status === 'yes') handle?.burst();
    };
    window.addEventListener('aef-rsvp', onRsvp);

    return () => {
      dead = true;
      window.removeEventListener('aef-rsvp', onRsvp);
      handle?.dispose();
    };
  }, [compact]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  );
}
