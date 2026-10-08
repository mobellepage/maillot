// Collectors matching the market search (by username). Shown above the shirt
// results once the query has two characters; only members who show at least
// one shirt or listing can be found (search_collectors).
import { Link } from 'react-router';
import { BY } from '../../data.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import type { CollectorHit } from '../../utils/db.ts';
import { HEX, ShirtGraphic } from '../../ui/index.ts';

export function CollectorResults({ hits }: { hits: CollectorHit[] }) {
  const { t, tp } = usePrefs();
  if (!hits.length) return null;

  return (
    <section aria-labelledby="collectors-title" style={{ marginBottom: 28 }}>
      <h2 id="collectors-title" className="title" style={{ fontSize: 17 }}>
        {t('coll.searchTitle')} <span className="mono" style={{ color: 'var(--muted)', fontSize: 13 }}>{hits.length}</span>
      </h2>
      <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0', display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,260px),1fr))' }}>
        {hits.map((c) => (
          <li key={c.handle} className="card card--interactive" style={{ padding: 14, borderRadius: 18, position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid var(--accent)', background: 'var(--avatar-grad)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 14, flex: 'none' }}>
              {c.handle.slice(0, 2).toUpperCase()}
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Link to={'/u/' + c.handle} className="stretched-link" style={{ display: 'block', color: 'var(--text)', fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                @{c.handle}
              </Link>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                {[c.shirts ? tp('coll.shirts', c.shirts) : null, c.listings ? tp('coll.listings', c.listings) : null].filter(Boolean).join(' · ')}
              </div>
            </div>
            <div aria-hidden="true" style={{ display: 'flex', flex: 'none' }}>
              {c.preview.slice(0, 3).map((id, i) => {
                const s = BY[id];
                return (
                  <span key={id + i} style={{ width: 30, height: 30, marginLeft: i ? -8 : 0, borderRadius: 9, background: 'var(--sunken)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center' }}>
                    <ShirtGraphic pat={s?.pat ?? HEX.placeholderPat} trim={s?.trim ?? HEX.muted} crest={s?.crest ?? HEX.muted} flat style={{ width: '78%' }} />
                  </span>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
