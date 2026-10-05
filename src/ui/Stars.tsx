// Star rating: a read-only display, or a radio group when onChange is given
// (arrow keys move between stars, as with any radio group).
import { useId } from 'react';

export function Stars({ value, onChange, label, size = 16 }: { value: number; onChange?: (n: number) => void; label: string; size?: number }) {
  const name = useId();
  if (!onChange)
    return (
      <span role="img" aria-label={label} style={{ color: 'var(--warn)', fontSize: size, letterSpacing: 1, whiteSpace: 'nowrap' }}>
        {'★'.repeat(Math.round(value))}
        <span style={{ color: 'var(--faint-2)' }}>{'★'.repeat(5 - Math.round(value))}</span>
      </span>
    );
  return (
    <div role="radiogroup" aria-label={label} style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <label key={n} style={{ cursor: 'pointer', fontSize: size, color: n <= value ? 'var(--warn)' : 'var(--faint-2)', lineHeight: 1 }}>
          <input type="radio" name={name} value={n} checked={value === n} onChange={() => onChange(n)} className="sr-only" aria-label={String(n)} />
          ★
        </label>
      ))}
    </div>
  );
}
