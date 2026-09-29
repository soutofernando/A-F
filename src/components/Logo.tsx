import type { CSSProperties } from 'react';

type Props = {
  /** Rendered height in px. Width scales with the logo's aspect ratio. Omit when sizing via className/style. */
  height?: number;
  className?: string;
  style?: CSSProperties;
  priority?: boolean;
};

/**
 * Monograma do casamento (Alicia & Fernando). PNG com fundo transparente,
 * servido de /AeF.png. Aspect ratio nativo 648×385.
 */
export function Logo({ height, className, style, priority }: Props) {
  const sized = height != null && style?.height == null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/AeF.png"
      alt="Alicia & Fernando"
      width={sized ? Math.round((height * 648) / 385) : undefined}
      height={sized ? height : undefined}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={className}
      style={{
        display: 'block',
        width: 'auto',
        ...(sized ? { height } : null),
        ...style,
      }}
    />
  );
}
