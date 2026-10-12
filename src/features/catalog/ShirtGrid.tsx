import type { Shirt } from '../../data.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { Link } from 'react-router';
import { ScrollRow, ShirtCard, ShirtGraphic, WatchButton } from '../../ui/index.ts';
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

/** The same cards in one sideways-scrolling row, with arrows for more. */
export function ShirtRow({ shirts, label }: { shirts: Shirt[]; label?: string }) {
  const { money, t } = usePrefs();
  const watch = useWatchlist();
  return (
    <ScrollRow label={label} prevLabel={t('common.scrollPrev')} nextLabel={t('common.scrollNext')}>
      {shirts.map((s) => (
        <li key={s.id}>
          <ShirtCard s={toCard(s, money)} watched={watch.has(s.id)} onToggleWatch={watch.toggle} />
        </li>
      ))}
    </ScrollRow>
  );
}

/** The same shirts as a compact list: easier to compare names and prices. */
export function ShirtList({ shirts, label }: { shirts: Shirt[]; label?: string }) {
  const { money, t } = usePrefs();
  const watch = useWatchlist();
  return (
    <ul aria-label={label} style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 6 }}>
      {shirts.map((s) => {
        const c = toCard(s, money);
        return (
          <li key={s.id} className="card card--interactive" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14, padding: '8px 12px 8px 8px', borderRadius: 16 }}>
            <span style={{ width: 64, height: 64, borderRadius: 12, overflow: 'hidden', background: 'var(--sunken)', display: 'grid', placeItems: 'center', flex: 'none' }}>
              <ShirtGraphic {...c.look} flat style={{ width: '80%' }} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <Link to={'/shirt/' + s.id} className="stretched-link" style={{ display: 'block', color: 'var(--text)', fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {s.name}
              </Link>
              <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                {s.brand} · {s.season} · {t(c.tag)}
              </span>
            </span>
            <span style={{ textAlign: 'right', flex: 'none' }}>
              <span className="mono" style={{ display: 'block', fontWeight: 700, fontSize: 15 }}>
                {c.priceFmt}
              </span>
              <span className="mono" style={{ display: 'block', fontSize: 12, color: c.up ? 'var(--pos)' : 'var(--neg)' }}>
                {c.chFmt}
              </span>
            </span>
            <WatchButton name={s.name} watched={watch.has(s.id)} onToggle={() => watch.toggle(s.id)} size={34} style={{ position: 'relative', zIndex: 2, flex: 'none', background: 'var(--sunken)', boxShadow: 'none', color: watch.has(s.id) ? 'var(--accent)' : 'var(--text-2)' }} />
          </li>
        );
      })}
    </ul>
  );
}
