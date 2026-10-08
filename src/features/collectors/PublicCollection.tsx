// A collector's visible shirts on their profile (/u/:handle): the main
// picture (studio cut-out when there is one), name, size, flock, condition
// and whether it's for sale. No values — what a collection is worth stays
// with its owner.
import { Link } from 'react-router';
import { BY } from '../../data.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { usePhotoUrls } from '../../lib/usePhotoUrls.ts';
import type { PublicShirt } from '../../utils/db.ts';
import type { Photo } from '../../types/domain.ts';
import { Badge, HEX, ShirtGraphic, alpha } from '../../ui/index.ts';

const photoOf = (s: PublicShirt): Photo | undefined => (s.photo_path ? { path: s.photo_path, thumbPath: s.thumb_path ?? undefined } : undefined);

export function PublicCollection({ shirts }: { shirts: PublicShirt[] }) {
  const { t, label } = usePrefs();
  const url = usePhotoUrls(shirts.map(photoOf), true);

  return (
    <ul className="grid-cards" style={{ listStyle: 'none', padding: 0, margin: '14px 0 0', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,190px),1fr))' }}>
      {shirts.map((s) => {
        const cat = s.catalog_id ? BY[s.catalog_id] : undefined;
        const name = cat?.name ?? ([s.club, s.season, s.variant].filter(Boolean).join(' ') || t('coll.untitled'));
        const src = url(photoOf(s));
        const player = [s.player_name, s.player_number].filter(Boolean).join(' ');
        return (
          <li key={s.id} className={'card' + (cat ? ' card--interactive' : '')} style={{ padding: 0, borderRadius: 20, overflow: 'hidden', position: 'relative' }}>
            <div style={{ aspectRatio: '1/1', display: 'grid', placeItems: 'center', position: 'relative', background: src ? '#0A0C0B' : `radial-gradient(circle at 50% 46%,${alpha(cat ? cat.glow : HEX.muted, 0.3)},rgba(0,0,0,0) 62%),var(--sunken)` }}>
              {src ? (
                <img src={src} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <ShirtGraphic pat={cat?.pat ?? HEX.placeholderPat} trim={cat?.trim ?? HEX.muted} crest={cat?.crest ?? HEX.muted} style={{ width: '64%' }} />
              )}
              <div style={{ position: 'absolute', top: 10, left: 10, right: 10, display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'space-between' }}>
                {s.verified ? <Badge tone="accent">{t('coll.verified')}</Badge> : <span />}
                {s.visibility !== 'public' && <Badge tone="info">{t('vault.vis.' + s.visibility)}</Badge>}
              </div>
            </div>
            <div style={{ padding: '12px 14px 14px' }}>
              {cat ? (
                <Link to={'/shirt/' + cat.id} className="stretched-link" style={{ display: 'block', color: 'var(--text)', fontWeight: 600, fontSize: 14.5, lineHeight: 1.25 }}>
                  {name}
                </Link>
              ) : (
                <div style={{ fontWeight: 600, fontSize: 14.5, lineHeight: 1.25 }}>{name}</div>
              )}
              <div className="mono" style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 6 }}>
                {[s.size && t('coll.size', { size: s.size }), player, s.version && label('opt', s.version), s.grade !== null && s.grade + '/10'].filter(Boolean).join(' · ')}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
