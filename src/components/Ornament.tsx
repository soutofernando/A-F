import type { CSSProperties } from 'react';

type Props = { color?: string; width?: number; style?: CSSProperties };

export function Ornament({ color = 'var(--gold-soft)', width = 60, style = {} }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color, ...style }}>
      <div style={{ width, height: 1, background: 'currentColor', opacity: 0.5 }} />
      <svg width="12" height="12" viewBox="0 0 12 12" style={{ opacity: 0.8 }}>
        <path d="M6 1 L7 5 L11 6 L7 7 L6 11 L5 7 L1 6 L5 5 Z" fill="currentColor" />
      </svg>
      <div style={{ width, height: 1, background: 'currentColor', opacity: 0.5 }} />
    </div>
  );
}
