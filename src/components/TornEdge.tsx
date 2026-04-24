type Props = {
  from?: string;
  to?: string;
  position?: 'top' | 'bottom';
};

export function TornEdge({ from = '#0E0B09', to = 'var(--bone)', position = 'top' }: Props) {
  const path =
    position === 'top'
      ? 'M0 40 L0 22 Q12 10 24 18 T48 16 T72 12 T96 19 T120 14 T144 20 T168 13 T192 19 T216 11 T240 17 T264 14 T288 20 T312 12 T336 18 T360 15 T384 20 T400 16 L400 40 Z'
      : 'M0 0 L400 0 L400 18 Q388 32 376 22 T352 24 T328 28 T304 21 T280 26 T256 19 T232 27 T208 21 T184 29 T160 23 T136 26 T112 20 T88 28 T64 22 T40 27 T16 21 T0 25 Z';
  return (
    <div style={{ position: 'relative', height: 28, background: from, overflow: 'hidden' }}>
      <svg
        viewBox="0 0 400 40"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <path d={path} fill={to} />
        <path
          d={path}
          fill="rgba(0,0,0,.25)"
          transform="translate(0,-2)"
          style={{ filter: 'blur(2px)', opacity: 0.4 }}
        />
      </svg>
    </div>
  );
}
