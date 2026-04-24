'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  style?: CSSProperties;
};

export function Reveal({ children, delay = 0, y = 20, className = '', style = {} }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVis(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.15, root: el.closest('[data-scrollroot]') as Element | null },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transition: 'opacity 1s cubic-bezier(.2,.7,.2,1), transform 1s cubic-bezier(.2,.7,.2,1)',
        transitionDelay: `${delay}ms`,
        opacity: vis ? 1 : 0,
        transform: vis ? 'none' : `translateY(${y}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
