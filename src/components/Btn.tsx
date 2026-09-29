'use client';

import type { CSSProperties, ReactNode } from 'react';

type Variant = 'outline' | 'solid' | 'ghost' | 'gold' | 'primary' | 'secondary' | 'confirmed';

type Props = {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  small?: boolean;
  style?: CSSProperties;
  type?: 'button' | 'submit';
  disabled?: boolean;
};

const CLASS: Record<Variant, string> = {
  primary: 'btn btn-primary',
  solid: 'btn btn-primary',
  secondary: 'btn btn-secondary',
  outline: 'btn btn-secondary',
  ghost: 'btn btn-secondary',
  gold: 'btn btn-secondary',
  confirmed: 'btn btn-confirmed',
};

export function Btn({
  children,
  onClick,
  variant = 'primary',
  small = false,
  style = {},
  type = 'button',
  disabled,
}: Props) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${CLASS[variant]}${small ? ' btn-sm' : ''}`}
      style={style}
    >
      {children}
    </button>
  );
}
