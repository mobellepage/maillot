import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'light' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface StyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
}

function cls({ variant = 'primary', size = 'md', block }: StyleProps, extra?: string) {
  return ['btn', 'btn--' + variant, size !== 'md' && 'btn--' + size, block && 'btn--block', extra].filter(Boolean).join(' ');
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, StyleProps {
  busy?: boolean;
  busyLabel?: ReactNode;
}

/** The one button. `busy` disables it and swaps in `busyLabel` while an async action runs. */
export function Button({ variant, size, block, busy, busyLabel, className, children, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={cls({ variant, size, block }, className)} disabled={disabled || busy} aria-busy={busy || undefined} {...rest}>
      {busy && busyLabel ? busyLabel : children}
    </button>
  );
}

/** A router link that looks like a button (real <a href>, so it can be opened in a new tab). */
export function ButtonLink({ variant, size, block, className, ...rest }: LinkProps & StyleProps) {
  return <Link className={cls({ variant, size, block }, className)} {...rest} />;
}

export function LinkButton({ muted, className, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { muted?: boolean }) {
  return <button type={type} className={['link-btn', muted && 'link-btn--muted', className].filter(Boolean).join(' ')} {...rest} />;
}
