import type { CSSProperties } from 'react';

type Props = {
  /** Rendered height in px. Width scales with the logo's aspect ratio. */
  height?: number;
  className?: string;
  style?: CSSProperties;
  priority?: boolean;
};

/**
 * Monograma do casamento (Alicia & Fernando). PNG com fundo transparente,
 * servido de /AeF.png. Aspect ratio nativo 648×385.
 */
export function Logo({ height = 32, className, style, priority }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/AeF.png"
      alt="Alicia & Fernando"
      width={Math.round((height * 648) / 385)}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={className}
      style={{ height, width: 'auto', display: 'block', ...style }}
    />
  );
}
