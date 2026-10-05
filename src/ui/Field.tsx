import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { SearchIcon } from './icons.tsx';

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  /** Visible label above the field. */
  label?: ReactNode;
  /** Accessible name when there is no visible label. */
  srLabel?: string;
  /** Leading adornment inside the field (icon, currency). */
  adornment?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  large?: boolean;
}

/** Text input with an optional visible label, leading adornment, hint and error. */
export const TextField = forwardRef<HTMLInputElement, FieldProps>(function TextField({ label, srLabel, adornment, hint, error, large, id, style, ...rest }, ref) {
  const autoId = useId();
  const inputId = id || autoId;
  const hintId = hint || error ? inputId + '-hint' : undefined;
  return (
    <div style={style}>
      {label && (
        <label htmlFor={inputId} style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
          {label}
        </label>
      )}
      <div className={'field' + (large ? ' field--lg' : '')} style={error ? { borderColor: 'var(--neg)' } : undefined}>
        {adornment}
        <input ref={ref} id={inputId} aria-label={label ? undefined : srLabel} aria-describedby={hintId} aria-invalid={error ? true : undefined} {...rest} />
      </div>
      {(error || hint) && (
        <div id={hintId} style={{ fontSize: 13, marginTop: 8, color: error ? 'var(--neg)' : 'var(--muted)' }}>
          {error || hint}
        </div>
      )}
    </div>
  );
});

export function SearchField(props: Omit<FieldProps, 'adornment'>) {
  return <TextField type="search" adornment={<SearchIcon />} {...props} />;
}
