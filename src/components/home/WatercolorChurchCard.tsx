'use client';

import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useHeroScene } from '@/hooks/useHeroScene';
import { HERO_IMAGE } from '@/lib/site';

const HeroCanvas = dynamic(() => import('./HeroCanvas').then((m) => m.HeroCanvas), { ssr: false });

type Props = {
  children?: ReactNode;
  minHeight?: number;
};

export function WatercolorChurchCard({ children, minHeight = 300 }: Props) {
  const { paint, shift } = useHeroScene();

  return (
    <div className="watercolor-church-card" style={{ position: 'relative', minHeight, background: 'var(--paper)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={HERO_IMAGE}
        alt=""
        decoding="async"
        className="watercolor-church-card__img"
        style={{
          transform: paint ? undefined : `translate3d(${shift.x * 10}px, ${shift.y * 6}px, 0) scale(1.06)`,
        }}
      />
      {paint && <HeroCanvas compact />}
      <div className="hero-grade watercolor-church-card__grade" aria-hidden />
      <div className="watercolor-church-card__overlay">{children}</div>
    </div>
  );
}
