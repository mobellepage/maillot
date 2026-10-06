import { useState } from 'react';

// When a live number changes (a new ask, a higher bid) it briefly glows in the
// direction it moved. Changing `scope` (another size, another shirt) swaps the
// number without a flash, because nothing moved. `n` restarts the animation.
export function useFlash(value: number | undefined, scope: string) {
  const [seen, setSeen] = useState({ value, scope });
  const [flash, setFlash] = useState<{ dir: 'up' | 'down'; n: number } | null>(null);
  if (seen.value !== value || seen.scope !== scope) {
    setSeen({ value, scope });
    if (seen.scope === scope && seen.value != null && value != null) setFlash({ dir: value > seen.value ? 'up' : 'down', n: (flash?.n ?? 0) + 1 });
    else if (flash) setFlash(null);
  }
  return flash;
}
