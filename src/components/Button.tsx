import React from 'react';
import { sfx } from '../lib/sound';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  full?: boolean;
  /** Suppress the automatic click sound for this button (e.g. custom sfx). */
  silent?: boolean;
}

export function Button({
  variant = 'primary',
  full = false,
  silent = false,
  className = '',
  children,
  onClick,
  disabled,
  ...rest
}: Props) {
  const variantClass =
    variant === 'primary'
      ? 'btn-primary'
      : variant === 'secondary'
        ? 'btn-secondary'
        : variant === 'danger'
          ? 'btn-danger'
          : 'btn-ghost';

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (!silent && !disabled) {
      if (variant === 'danger') sfx.warn();
      else if (variant === 'ghost' || variant === 'secondary') sfx.tap();
      else sfx.click();
    }
    onClick?.(e);
  }

  return (
    <button
      className={`btn ${variantClass} ${full ? 'w-full' : ''} ${className}`}
      onClick={handleClick}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
