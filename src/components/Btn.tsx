'use client';

import type { CSSProperties, ReactNode } from 'react';

type Variant = 'outline' | 'solid' | 'ghost' | 'gold';

type Props = {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  small?: boolean;
  style?: CSSProperties;
  type?: 'button' | 'submit';
};

const variants: Record<Variant, CSSProperties> = {
  outline: { border: '1px solid rgba(239,231,219,.5)', background: 'transparent', color: 'var(--cream)' },
  solid: { border: '1px solid var(--gold)', background: 'var(--gold)', color: '#0E0B09' },
  ghost: { border: '1px solid rgba(14,11,9,.4)', background: 'transparent', color: 'var(--ink)' },
  gold: { border: '1px solid var(--gold-soft)', background: 'transparent', color: 'var(--gold-soft)' },
};

export function Btn({ children, onClick, variant = 'outline', small = false, style = {}, type = 'button' }: Props) {
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: small ? '9px 18px' : '12px 26px',
    fontFamily: 'var(--font-inter), Inter, sans-serif',
    fontSize: small ? 10 : 11,
    letterSpacing: '.22em',
    textTransform: 'uppercase',
    fontWeight: 400,
    borderRadius: 0,
    cursor: 'pointer',
    transition: 'all .3s ease',
    ...style,
  };
  return (
    <button type={type} onClick={onClick} style={{ ...base, ...variants[variant] }}>
      {children}
    </button>
  );
}
