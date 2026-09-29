'use client';

import Link from 'next/link';
import { useRef, type ReactNode } from 'react';

type Props = {
  href: string;
  className?: string;
  children: ReactNode;
};

export function Magnet({ href, className, children }: Props) {
  const ref = useRef<HTMLAnchorElement>(null);

  const move = (event: React.PointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType !== 'mouse') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = event.clientX - (rect.left + rect.width / 2);
    const y = event.clientY - (rect.top + rect.height / 2);
    node.style.transform = `translate(${x * 0.18}px, ${y * 0.22}px)`;
  };

  const leave = () => {
    if (ref.current) ref.current.style.transform = '';
  };

  return (
    <Link ref={ref} href={href} className={className} onPointerMove={move} onPointerLeave={leave}>
      {children}
      <span className="btn-ripple" aria-hidden />
    </Link>
  );
}
