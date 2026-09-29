import type { CSSProperties } from 'react';

type Props = { color?: string; width?: number; style?: CSSProperties };

export function Ornament({ color = 'var(--dourado)', width = 60, style = {} }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color, ...style }} aria-hidden>
      <div style={{ width, height: 1, background: 'currentColor' }} />
      <svg width="12" height="12" viewBox="0 0 12 12">
        <path d="M6 1 L7.1 4.9 L11 6 L7.1 7.1 L6 11 L4.9 7.1 L1 6 L4.9 4.9 Z" fill="currentColor" />
      </svg>
      <div style={{ width, height: 1, background: 'currentColor' }} />
    </div>
  );
}
