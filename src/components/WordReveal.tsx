'use client';

import { useEffect, useRef, useState, type CSSProperties, type ElementType } from 'react';

type Props = {
  text: string;
  as?: ElementType;
  delay?: number;
  stagger?: number;
  className?: string;
  style?: CSSProperties;
  trigger?: 'mount' | 'scroll';
};

export function WordReveal({
  text,
  as: Tag = 'div',
  delay = 0,
  stagger = 60,
  className = '',
  style,
  trigger = 'mount',
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(trigger === 'mount');

  useEffect(() => {
    if (trigger === 'mount') {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setVisible(true);
        });
      },
      { threshold: 0.2, root: el.closest('[data-scrollroot]') as Element | null },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [trigger]);

  const words = text.split(' ');

  return (
    <Tag ref={ref as never} className={className} style={style}>
      {words.map((w, i) => (
        <span
          key={i}
          className={`word ${visible ? 'visible' : ''}`}
          style={{ animationDelay: `${delay + i * stagger}ms`, marginRight: '0.25em' }}
        >
          {w}
        </span>
      ))}
    </Tag>
  );
}
