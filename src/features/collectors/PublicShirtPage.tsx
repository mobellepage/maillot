// /u/:handle/:itemId — one shirt from a member's collection, as their friends
// see it: the owner's own pictures (main photo and back), name, size, print,
// condition and whether it's open to offers. The catalogue page stays one
// tap away for the market side.
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { BY } from '../../data.ts';
import { formatDate } from '../../lib/format.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { usePhotoUrls } from '../../lib/usePhotoUrls.ts';
import { useSession } from '../../lib/session.tsx';
import * as db from '../../utils/db.ts';
import { Badge, EmptyState, ErrorState, HEX, Page, ShirtGraphic, Skeleton, alpha } from '../../ui/index.ts';
import { useCatalog } from '../catalog/useCatalog.ts';
import { marketValue } from '../catalog/model.ts';
import { OfferButton } from './OfferButton.tsx';

export default function PublicShirtPage() {
  useCatalog();
  const { handle = '', itemId = '' } = useParams();
  const { t, label, lang } = usePrefs();
  const { user } = useSession();
  const collection = useQuery({ queryKey: ['publicCollection', handle], queryFn: () => db.loadPublicCollection(handle) });
  const photos = useQuery({ queryKey: ['publicShirtPhotos', handle.toLowerCase(), itemId], queryFn: () => db.loadPublicShirtPhotos(handle, itemId) });
  const stats = useQuery({ queryKey: ['collectorStats', handle.toLowerCase(), user?.id], queryFn: () => db.loadCollectorStats(handle) });
  const pics = (photos.data ?? []).map((p) => ({ kind: p.kind, photo: { path: p.path, thumbPath: p.thumb_path ?? undefined } }));
  const full = usePhotoUrls(pics.map((p) => p.photo));
  const thumb = usePhotoUrls(pics.map((p) => p.photo), true);
  const [shown, setShown] = useState(0);

  const s = collection.data?.find((x) => x.id === itemId);
  const cat = s?.catalog_id ? BY[s.catalog_id] : undefined;
  const name = s ? (cat?.name ?? ([s.club, s.season, s.variant].filter(Boolean).join(' ') || t('coll.untitled'))) : '';
  usePageMeta(s ? t('pshirt.meta', { name, handle }) : null);

  if (collection.isLoading)
    return (
      <Page>
        <Skeleton height={420} radius={28} />
      </Page>
    );
  if (collection.isError)
    return (
      <Page>
        <ErrorState what={'@' + handle} onRetry={() => collection.refetch()} />
      </Page>
    );
  if (!s)
    return (
      <Page narrow>
        <EmptyState title={t('pshirt.notFound')}>{t('pshirt.notFoundBody', { handle })}</EmptyState>
      </Page>
    );

  const current = pics[Math.min(shown, pics.length - 1)];
  const src = current ? full(current.photo) : undefined;
  const player = [s.player_name, s.player_number].filter(Boolean).join(' ');
  const facts: [string, string][] = [
    s.size ? [t('pshirt.size'), s.size] : null,
    player ? [t('pshirt.print'), player] : null,
    s.version ? [t('pshirt.version'), label('opt', s.version)] : null,
    s.grade !== null ? [t('pshirt.condition'), s.grade + '/10'] : null,
    [t('pshirt.since'), formatDate(s.added_at, lang)]
  ].filter((x): x is [string, string] => !!x);
  const canOffer = !stats.data?.is_me && !!cat && !!s.size && (s.visibility === 'offers' || s.visibility === 'forsale');

  return (
    <Page>
      <Link to={'/u/' + handle} className="nav-link" style={{ display: 'inline-block', padding: '4px 0', fontSize: 14 }}>
        ← @{handle}
      </Link>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(24px,4vw,56px)', marginTop: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 420px', minWidth: 0 }}>
          <div style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 28, overflow: 'hidden', display: 'grid', placeItems: 'center', border: '1px solid var(--line)', background: src ? 'var(--sunken)' : `radial-gradient(circle at 50% 44%,${alpha(cat ? cat.glow : HEX.muted, 0.3)},rgba(0,0,0,0) 60%),var(--sunken)` }}>
            {src ? (
              <img src={src} alt={current?.kind === 'back' ? t('pshirt.backPhoto') : name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : photos.isLoading ? (
              <Skeleton height="100%" radius={0} />
            ) : (
              <ShirtGraphic hero pat={cat?.pat ?? HEX.placeholderPat} trim={cat?.trim ?? HEX.muted} crest={cat?.crest ?? HEX.muted} photo={cat?.photo} title={name} style={{ width: '66%' }} />
            )}
          </div>
          {pics.length > 1 && (
            <div role="group" aria-label={t('pshirt.photos')} style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              {pics.map((p, i) => (
                <button key={p.kind} type="button" aria-pressed={i === shown} aria-label={p.kind === 'back' ? t('pshirt.backPhoto') : t('pshirt.front')} onClick={() => setShown(i)} style={{ width: 72, height: 72, padding: 0, borderRadius: 14, overflow: 'hidden', cursor: 'pointer', border: `2px solid ${i === shown ? 'var(--text)' : 'var(--line)'}`, background: 'var(--sunken)' }}>
                  {thumb(p.photo) && <img src={thumb(p.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: '1 1 340px', minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)' }}>{t('pshirt.from', { handle })}</div>
          <h1 className="display display--lg" style={{ margin: '8px 0 0', fontSize: 'clamp(30px,4vw,46px)' }}>
            {name}
          </h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            {s.verified && <Badge tone="accent">{t('coll.verified')}</Badge>}
            {s.visibility !== 'public' && <Badge tone="info">{t('vault.vis.' + s.visibility)}</Badge>}
          </div>
          <dl style={{ margin: '22px 0 0', display: 'grid', gap: 0 }}>
            {facts.map(([k, v]) => (
              <div key={k} className="kv">
                <dt style={{ color: 'var(--muted)' }}>{k}</dt>
                <dd style={{ margin: 0, fontWeight: 600 }}>{v}</dd>
              </div>
            ))}
          </dl>
          {canOffer && cat && s.size && <OfferButton itemId={s.id} name={name} owner={handle} suggested={marketValue(cat, s.size)} />}
          {cat && (
            <Link to={'/shirt/' + cat.id} style={{ display: 'inline-block', marginTop: 20, fontWeight: 600 }}>
              {t('pshirt.catalog')} ›
            </Link>
          )}
        </div>
      </div>
    </Page>
  );
}
