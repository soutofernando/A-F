import type { ReactNode } from 'react';

export type RusticName =
  | 'church'
  | 'cross'
  | 'olive'
  | 'rings'
  | 'gift'
  | 'seal'
  | 'clock'
  | 'gate'
  | 'dress'
  | 'sun'
  | 'home'
  | 'pan'
  | 'moon'
  | 'petal';

type Props = { name: RusticName; size?: number };

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function RusticIcon({ name, size = 28 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      {paths[name]}
    </svg>
  );
}

const paths: Record<RusticName, ReactNode> = {
  church: (
    <g {...stroke}>
      <path d="M16 3.5v4.2M13.4 5.4h5.2" />
      <path d="M7 28V15.5C7 9.8 11 7.2 16 7.2S25 9.8 25 15.5V28" />
      <path d="M12.2 28v-6.2c0-2.1 1.7-3.4 3.8-3.4s3.8 1.3 3.8 3.4V28" />
      <circle cx="12.2" cy="15.2" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="19.8" cy="15.2" r="1.15" fill="currentColor" stroke="none" />
    </g>
  ),
  cross: (
    <g {...stroke}>
      <path d="M16 4.5v23M9 11.2h14" />
      <path d="M16 7.2c1.4 1.6 1.4 3.2 0 4.6-1.4-1.4-1.4-3 0-4.6z" fill="currentColor" stroke="none" />
    </g>
  ),
  olive: (
    <g {...stroke}>
      <path d="M7 26C12 18 16 13 26 6" />
      <path d="M12.5 18.5c-3.2-.4-5 2.2-3.6 4.4 1.8 1.2 4.2-.2 3.6-4.4z" fill="currentColor" stroke="none" opacity="0.85" />
      <path d="M18.2 11.2c2.6-2.4 5.4-1.2 5.2 1.6-.6 2.4-3.6 2.8-5.2-1.6z" fill="currentColor" stroke="none" opacity="0.85" />
      <path d="M14.2 16.2c2.2-1.2 3.6.6 2.2 2.4-1.6 1.2-3.4.2-2.2-2.4z" fill="currentColor" stroke="none" opacity="0.7" />
    </g>
  ),
  rings: (
    <g {...stroke}>
      <circle cx="12.2" cy="16" r="6.2" />
      <circle cx="19.8" cy="16" r="6.2" />
      <path d="M16 12.2v2.2M16 17.6v2.2" />
    </g>
  ),
  gift: (
    <g {...stroke}>
      <path d="M7.5 14.5h17v11h-17z" />
      <path d="M7.5 19h17M16 14.5V25.5" />
      <path d="M16 14.5c-2.4-3.4-6.2-3.2-6.2-.4 0 2.2 3.4 2.8 6.2.4z" />
      <path d="M16 14.5c2.4-3.4 6.2-3.2 6.2-.4 0 2.2-3.4 2.8-6.2.4z" />
    </g>
  ),
  seal: (
    <g {...stroke}>
      <circle cx="16" cy="16" r="9.2" />
      <circle cx="16" cy="16" r="6.2" />
      <path d="M16 11.2v9.6M12.4 14.4h7.2" />
    </g>
  ),
  clock: (
    <g {...stroke}>
      <circle cx="16" cy="16" r="9.2" />
      <path d="M16 16V9.2M16 16H10.4" />
      <circle cx="16" cy="16" r="1.1" fill="currentColor" stroke="none" />
    </g>
  ),
  gate: (
    <g {...stroke}>
      <path d="M5 26V13M11 26V11M16 26V10M21 26V11M27 26V13" />
      <path d="M5 14.5C9 8 13 8 16 10.5 19 8 23 8 27 14.5" />
    </g>
  ),
  dress: (
    <g {...stroke}>
      <path d="M11 8.5 16 12l5-3.5" />
      <path d="M16 6.2v2.4" />
      <path d="M12.2 14.2c1.2-1.4 6.4-1.4 7.6 0L22 26H10l2.2-11.8z" />
    </g>
  ),
  sun: (
    <g {...stroke}>
      <circle cx="16" cy="16" r="4.2" />
      <path d="M16 5.5v2.6M16 23.9v2.6M5.5 16h2.6M23.9 16h2.6M8.4 8.4l1.8 1.8M21.8 21.8l1.8 1.8M23.6 8.4l-1.8 1.8M10.2 21.8l-1.8 1.8" />
    </g>
  ),
  home: (
    <g {...stroke}>
      <path d="M6 15.5 16 7l10 8.5" />
      <path d="M9 14.2V26h14V14.2" />
      <path d="M13.5 26v-6h5v6" />
    </g>
  ),
  pan: (
    <g {...stroke}>
      <circle cx="14" cy="16" r="6.4" />
      <path d="M19.6 13.2 27 9.2M19.8 18.4 27 22" />
    </g>
  ),
  moon: (
    <g {...stroke}>
      <path d="M18 6.5a8.8 8.8 0 1 0 6.2 15.2A7.4 7.4 0 0 1 18 6.5z" fill="currentColor" stroke="none" opacity="0.9" />
      <path d="M8 22c3-1 5.5-.4 8 1.6" />
    </g>
  ),
  petal: (
    <g {...stroke}>
      <path d="M16 27C10 20 8 14 16 5c8 9 6 15 0 22z" fill="currentColor" stroke="none" opacity="0.85" />
      <path d="M16 27V10" />
    </g>
  ),
};
