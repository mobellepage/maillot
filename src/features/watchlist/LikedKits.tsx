// Library kits on the wishlist (from the feed or the library), with the print
// wanted on them: each opens in the library (where its owners show), the
// bookmark takes it off again.
import { Link } from 'react-router';
import { usePrefs } from '../../lib/prefs.tsx';
import { BookmarkIcon } from '../../ui/index.ts';
import { variantLabel } from '../library/model.ts';
import { useKitLikes } from './useKitLikes.ts';
import { WishKitDialog } from './WishKitDialog.tsx';
import { printLabel } from './printLabel.ts';
import { useState } from 'react';
import type { FeedKit } from '../../utils/db.ts';

export function LikedKits() {
  const { t } = usePrefs();
  const likes = useKitLikes();
  const [editing, setEditing] = useState<FeedKit | null>(null);
  if (!likes.kits.length) return null;
  return (
    <section aria-labelledby="liked-kits" style={{ marginBottom: 28 }}>
      <h2 id="liked-kits" className="title" style={{ margin: '0 0 12px' }}>
        {t('wish.kits', { n: likes.kits.length })}
      </h2>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,160px),1fr))' }}>
        {likes.kits.map((k) => {
          const variant = variantLabel(k.variant, t);
          const name = `${k.club_name} ${k.season}`;
          return (
            <li key={k.id} className="card" style={{ position: 'relative', padding: 12, borderRadius: 18 }}>
              <div style={{ aspectRatio: '1/1', borderRadius: 14, background: 'var(--sunken)', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
                {k.image_path && <img src={k.image_path} alt="" loading="lazy" decoding="async" style={{ width: '86%', height: '86%', objectFit: 'contain' }} />}
              </div>
              <Link to={'/library/' + k.club_id + '#season-' + k.season} className="stretched-link" style={{ display: 'block', marginTop: 10, fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                {name}
              </Link>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                {t('lib.kind.' + k.kind)}
                {variant && ' · ' + variant}
              </div>
              {/* The print wanted on it, and a way to change it. */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap', marginTop: 4, position: 'relative', zIndex: 2 }}>
                {printLabel(k) && <span style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--accent)' }}>{printLabel(k)}</span>}
                <button type="button" className="link-btn" onClick={() => setEditing(k)} style={{ fontSize: 12.5 }}>
                  {printLabel(k) ? t('wishkit.change') : t('wishkit.addPrint')}
                </button>
              </div>
              <button
                type="button"
                aria-label={t('wish.unlike', { name })}
                onClick={() => likes.toggle(k)}
                style={{ position: 'absolute', top: 18, right: 18, zIndex: 2, width: 34, height: 34, borderRadius: '50%', border: 0, background: 'rgba(10,12,11,0.72)', color: 'var(--accent-fill, #4BFF8B)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
              >
                <BookmarkIcon size={16} filled />
              </button>
            </li>
          );
        })}
      </ul>
      {editing && <WishKitDialog kit={editing} onClose={() => setEditing(null)} />}
    </section>
  );
}
