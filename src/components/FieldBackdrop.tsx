'use client';

import { useEffect, useRef } from 'react';

export type FieldTone = 'leaf' | 'gold' | 'petal' | 'sky';

const COLORS: Record<FieldTone, string[]> = {
  leaf: ['#8E9A5B', '#5F6B2F', '#C4A35A'],
  gold: ['#E0B04C', '#E9A582', '#8A6210'],
  petal: ['#E9A582', '#D0754F', '#F4E6D4'],
  sky: ['#8FB4DB', '#4F7FC2', '#E0B04C'],
};

type Mote = {
  x: number;
  y: number;
  r: number;
  speed: number;
  spin: number;
  turn: number;
  sway: number;
  color: string;
  alpha: number;
};

export function FieldBackdrop({ tone = 'leaf' }: { tone?: FieldTone }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobile = window.matchMedia('(max-width: 767px)').matches;
    const colors = COLORS[tone];
    let motes: Mote[] = [];
    let running = true;
    let raf = 0;
    let width = 1;
    let height = 1;

    const spawn = (fromTop = false): Mote => ({
      x: Math.random() * width,
      y: fromTop ? -20 : Math.random() * height,
      r: (tone === 'sky' ? 18 : 7) + Math.random() * (tone === 'sky' ? 28 : 10),
      speed: 0.15 + Math.random() * 0.45,
      spin: Math.random() * Math.PI * 2,
      turn: (Math.random() - 0.5) * 0.01,
      sway: 0.4 + Math.random() * 1.2,
      color: colors[Math.floor(Math.random() * colors.length)] ?? colors[0],
      alpha: tone === 'sky' ? 0.08 + Math.random() * 0.08 : 0.14 + Math.random() * 0.16,
    });

    const layout = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = mobile ? 10 : tone === 'sky' ? 8 : 16;
      motes = Array.from({ length: count }, () => spawn(false));
    };

    const drawMote = (mote: Mote) => {
      ctx.save();
      ctx.translate(mote.x, mote.y);
      ctx.rotate(mote.spin);
      ctx.globalAlpha = mote.alpha;
      ctx.fillStyle = mote.color;
      if (tone === 'gold' || tone === 'sky') {
        ctx.beginPath();
        ctx.arc(0, 0, mote.r * (tone === 'gold' ? 0.35 : 1), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(0, -mote.r);
        ctx.bezierCurveTo(mote.r * 0.85, -mote.r * 0.15, mote.r * 0.5, mote.r * 0.6, 0, mote.r);
        ctx.bezierCurveTo(-mote.r * 0.5, mote.r * 0.6, -mote.r * 0.85, -mote.r * 0.15, 0, -mote.r);
        ctx.fill();
      }
      ctx.restore();
    };

    const paint = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      motes.forEach((mote) => {
        if (!reduced) {
          mote.y += mote.speed;
          mote.x += Math.sin(time * 0.001 * mote.sway + mote.spin) * 0.35;
          mote.spin += mote.turn;
          if (mote.y > height + 24) {
            const next = spawn(true);
            mote.x = next.x;
            mote.y = next.y;
            mote.spin = next.spin;
          }
        }
        drawMote(mote);
      });
    };

    const frame = (time: number) => {
      raf = 0;
      if (!running) return;
      paint(time);
      if (!reduced) raf = requestAnimationFrame(frame);
    };

    layout();
    const kick = () => {
      if (raf) return;
      raf = requestAnimationFrame(frame);
    };

    const observer = new ResizeObserver(() => layout());
    observer.observe(canvas);
    const visibility = new IntersectionObserver(([entry]) => {
      running = entry.isIntersecting;
      if (running) kick();
    }, { threshold: 0.02 });
    visibility.observe(canvas);
    kick();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      visibility.disconnect();
    };
  }, [tone]);

  return <canvas ref={ref} className="field-bg" aria-hidden />;
}
