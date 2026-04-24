import type { CSSProperties, ReactNode } from 'react';

type Props = {
  label?: string;
  light?: boolean;
  style?: CSSProperties;
  className?: string;
  aspect?: string;
  children?: ReactNode;
};

export function Ph({ label, light = false, style = {}, className = '', aspect, children }: Props) {
  const s: CSSProperties = { ...style };
  if (aspect) s.aspectRatio = aspect;
  return (
    <div className={`ph ${light ? 'light' : ''} ${className}`} style={s}>
      {children}
      {label && <div className="ph-label">{label}</div>}
    </div>
  );
}
