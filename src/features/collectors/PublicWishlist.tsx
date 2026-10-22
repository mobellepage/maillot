// A collector's wishlist on their profile: the library kits they're looking
// for (with the print they want, e.g. "KAKÁ 22") and the catalogue shirts
// they watch — so others can see what they want and offer it.
import { Link } from 'react-router';
import { BY } from '../../data.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import type { PublicWish } from '../../utils/db.ts';
import { ShirtGraphic } from '../../ui/index.ts';
import { variantLabel } from '../library/model.ts';
import { printLabel } from '../watchlist/printLabel.ts';

export function PublicWishlist({ wishes }: { wishes: PublicWish[] }) {
  const { t } = usePrefs();
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0 0', display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,160px),1fr))' }}>
      {wishes.map((w) => {
        if (w.kit_id) {
          const variant = variantLabel(w.variant ?? '', t);
          const print = printLabel(w);
          return (
            <li key={'k' + w.kit_id} className="card" style={{ position: 'relative', padding: 12, borderRadius: 18 }}>
              <div className="kit-thumb" style={{ aspectRatio: '1/1', borderRadius: 14, display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
                {w.image_path && <img src={w.image_path} alt="" loading="lazy" decoding="async" style={{ width: '86%', height: '86%', objectFit: 'contain' }} />}
              </div>
              <Link to={'/library/' + w.club_id + '#season-' + w.season} className="stretched-link" style={{ display: 'block', marginTop: 10, fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                {w.club_name} {w.season}
              </Link>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                {t('lib.kind.' + w.kind)}
                {variant && ' · ' + variant}
              </div>
              {print && <div style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--accent)', marginTop: 4 }}>{t('wishkit.wanted', { print })}</div>}
            </li>
          );
        }
        const s = w.shirt_id ? BY[w.shirt_id] : undefined;
        if (!s) return null;
        return (
          <li key={'s' + w.shirt_id} className="card" style={{ position: 'relative', padding: 12, borderRadius: 18 }}>
            <div className="kit-thumb" style={{ aspectRatio: '1/1', borderRadius: 14, display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
              <ShirtGraphic pat={s.pat} trim={s.trim} crest={s.crest} photo={s.photo} flat style={{ width: '80%' }} />
            </div>
            <Link to={'/shirt/' + s.id} className="stretched-link" style={{ display: 'block', marginTop: 10, fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
              {s.name}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
