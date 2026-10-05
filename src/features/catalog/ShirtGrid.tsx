import type { Shirt } from '../../data.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { ShirtCard } from '../../ui/index.ts';
import { useWatchlist } from '../watchlist/useWatchlist.ts';
import { toCard } from './model.ts';

/** A grid of catalogue cards wired to the viewer's watchlist and currency. */
export function ShirtGrid({ shirts, label }: { shirts: Shirt[]; label?: string }) {
  const { money } = usePrefs();
  const watch = useWatchlist();
  return (
    <ul className="grid-cards" aria-label={label} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {shirts.map((s) => (
        <li key={s.id}>
          <ShirtCard s={toCard(s, money)} watched={watch.has(s.id)} onToggleWatch={watch.toggle} />
        </li>
      ))}
    </ul>
  );
}
