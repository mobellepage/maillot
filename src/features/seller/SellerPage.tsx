// /u/:handle — a member's public page: the shirts they show (visibility other
// than private, for sale ones marked), track record and reviews. Only what the
// member chose to make public plus facts from completed orders.
import { Link, useParams, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { BY } from '../../data.ts';
import { formatDate } from '../../lib/format.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import * as db from '../../utils/db.ts';
import { useCatalog } from '../catalog/useCatalog.ts';
import { Card, EmptyState, ErrorState, Page, Skeleton, StatTile } from '../../ui/index.ts';
import { Stars } from '../../ui/Stars.tsx';
import { PublicCollection } from '../collectors/PublicCollection.tsx';
import { PublicWishlist } from '../collectors/PublicWishlist.tsx';
import { FantasyProfile } from '../fantasy/FantasyProfile.tsx';
import { LevelBadge } from '../levels/LevelBadge.tsx';
import { FollowButton } from '../collectors/FollowButton.tsx';
import { DealerBadge } from '../collectors/DealerBadge.tsx';
import { publicCollectionValue } from '../collectors/collectionValue.ts';
import { useSession } from '../../lib/session.tsx';
import { Avatar } from '../avatars/Avatar.tsx';
import { FollowCounts } from '../collectors/FollowCounts.tsx';
import { HighlightsRow } from '../collectors/HighlightsRow.tsx';
import { usePhotoUrls } from '../../lib/usePhotoUrls.ts';
import { isCutoutPath } from '../vault/addshirt/studio.ts';

export default function SellerPage() {
  useCatalog();
  const { handle = '' } = useParams();
  const { t, tp, money, lang } = usePrefs();
  const profile = useQuery({ queryKey: ['seller', handle], queryFn: () => db.loadSellerProfile(handle) });
  const reviews = useQuery({ queryKey: ['sellerReviews', handle], queryFn: () => db.loadSellerReviews(handle), enabled: !!profile.data });
  const { user } = useSession();
  const collection = useQuery({ queryKey: ['publicCollection', handle, user?.id], queryFn: () => db.loadPublicCollection(handle), enabled: !!profile.data });
  const stats = useQuery({ queryKey: ['collectorStats', handle.toLowerCase(), user?.id], queryFn: () => db.loadCollectorStats(handle), enabled: !!profile.data });
  const wishlist = useQuery({ queryKey: ['publicWishlist', handle.toLowerCase()], queryFn: () => db.loadPublicWishlist(handle), enabled: !!profile.data });
  // Collection or wishlist, kept in the address so Back and shared links keep it.
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'wishlist' ? 'wishlist' : params.get('tab') === 'fantasy' ? 'fantasy' : 'collection';
  const value = stats.data?.show_value && collection.data ? publicCollectionValue(collection.data) : null;
  usePageMeta(t('seller.meta', { handle }), t('seller.metaDesc', { handle }));
  // The highlights as circles: the owner's photo, else the library picture.
  const top = (collection.data ?? []).filter((x) => x.highlighted);
  const thumb = usePhotoUrls(top.map((x) => (x.photo_path ? { path: x.photo_path, thumbPath: x.thumb_path ?? undefined } : undefined)), true);
  const highlights = top.map((x) => ({
    id: x.id,
    to: '/u/' + handle + '/' + encodeURIComponent(x.id),
    name: (x.catalog_id ? BY[x.catalog_id]?.name : undefined) ?? ([x.club, x.season].filter(Boolean).join(' ') || t('coll.untitled')),
    src: thumb(x.photo_path ? { path: x.photo_path, thumbPath: x.thumb_path ?? undefined } : undefined) ?? x.kit_image ?? undefined,
    cutout: !x.photo_path || isCutoutPath(x.photo_path)
  }));

  if (profile.isLoading)
    return (
      <Page>
        <Skeleton height={160} radius={20} />
      </Page>
    );
  if (profile.isError)
    return (
      <Page>
        <ErrorState what={'@' + handle} onRetry={() => profile.refetch()} />
      </Page>
    );
  const p = profile.data;
  if (!p)
    return (
      <Page narrow>
        <EmptyState title={t('seller.notFound')}>{t('seller.notFoundBody', { handle })}</EmptyState>
      </Page>
    );

  return (
    <Page>
      {/* Like Instagram: picture and numbers, then name, bio, favourite club, the button and the highlights. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(16px,5vw,40px)' }}>
        <div aria-hidden="true" style={{ width: 'clamp(76px,20vw,96px)', aspectRatio: '1/1', borderRadius: '50%', flex: 'none' }}>
          <Avatar avatar={stats.data?.avatar} name={p.handle} size={84} ring={false} style={{ width: '100%', height: '100%' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="display" style={{ fontSize: p.handle.length > 14 ? 'clamp(18px,5vw,34px)' : 'clamp(24px,4vw,38px)', margin: '0 0 10px', overflowWrap: 'anywhere' }}>
            @{p.handle}
          </h1>
          {stats.data && <FollowCounts handle={p.handle} shirts={stats.data.shirts} followers={stats.data.followers} following={stats.data.following} />}
        </div>
      </div>
      <div style={{ marginTop: 14, maxWidth: 560 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="eyebrow">{stats.data?.dealer ? t('dealer.eyebrow') : t('seller.eyebrow')}</span>
          {stats.data?.dealer && <DealerBadge />}
          {!!collection.data?.length && <LevelBadge shirts={collection.data.length} value={value?.total ?? 0} />}
        </div>
        {stats.data?.bio && <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{stats.data.bio}</p>}
        {stats.data?.club_id && (
          <Link to={'/library/' + stats.data.club_id} style={{ display: 'inline-block', marginTop: 6, fontSize: 14, fontWeight: 600 }}>
            ⭐ {stats.data.club_name}
          </Link>
        )}
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6 }}>{t('seller.since', { date: formatDate(p.member_since, lang) })}</div>
      </div>
      <div style={{ marginTop: 14 }}>
        <FollowButton handle={p.handle} stats={stats.data ?? undefined} />
      </div>
      <div style={{ marginTop: 18 }}>
        <HighlightsRow items={highlights} />
      </div>

      {/* The collection first (and what they're looking for); the figures and reviews follow. */}
      <nav aria-label={t('coll.sections')} style={{ display: 'flex', gap: 28, marginTop: 24, borderBottom: '1px solid var(--line)' }}>
        {(
          [
            ['collection', t('coll.title'), collection.data?.length],
            ['wishlist', t('vault.title.watchlist'), wishlist.data?.length],
            ['fantasy', t('fantasy.profile.title'), undefined]
          ] as const
        ).map(([k, label, n]) => (
          <button key={k} type="button" aria-current={tab === k ? 'page' : undefined} onClick={() => setParams(k === 'collection' ? {} : { tab: k }, { replace: true })} style={{ background: 'none', border: 0, cursor: 'pointer', padding: '0 0 12px', fontSize: 16, fontWeight: 700, color: tab === k ? 'var(--text)' : 'var(--muted)', borderBottom: `2px solid ${tab === k ? 'var(--accent)' : 'transparent'}`, marginBottom: -1, display: 'flex', gap: 8, alignItems: 'center' }}>
            {label}
            <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>
              {n ?? ''}
            </span>
          </button>
        ))}
      </nav>
      {tab === 'collection' ? (
        <section aria-label={t('coll.title')} style={{ marginTop: 14 }}>
          {collection.isLoading && <Skeleton height={220} radius={20} style={{ marginTop: 14 }} />}
          {collection.isError && <ErrorState compact what={t('coll.title')} onRetry={() => collection.refetch()} />}
          {collection.data && !collection.data.length && <p style={{ color: 'var(--muted)', fontSize: 14 }}>{stats.data?.collection_private ? (stats.data.is_me ? t('coll.privateMine') : t('coll.privateOther')) : t('coll.empty')}</p>}
          {!!collection.data?.length && <PublicCollection shirts={collection.data} owner={p.handle} />}
        </section>
      ) : tab === 'fantasy' ? (
        <section aria-label={t('fantasy.profile.title')}>
          <FantasyProfile handle={p.handle} />
        </section>
      ) : (
        <section aria-label={t('vault.title.watchlist')}>
          {wishlist.isLoading && <Skeleton height={220} radius={20} style={{ marginTop: 14 }} />}
          {wishlist.isError && <ErrorState compact what={t('vault.title.watchlist')} onRetry={() => wishlist.refetch()} />}
          {wishlist.data && !wishlist.data.length && <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 14 }}>{stats.data?.collection_private ? t('coll.wishPrivate') : t('coll.wishEmpty', { handle: p.handle })}</p>}
          {!!wishlist.data?.length && <PublicWishlist wishes={wishlist.data} />}
        </section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginTop: 40 }}>
        <StatTile
          highlight={p.rating !== null}
          label={t('seller.rating')}
          value={p.rating !== null ? <Stars value={Number(p.rating)} label={t('seller.stars', { n: Number(p.rating).toFixed(1) })} size={18} /> : t('seller.na')}
          sub={p.reviews ? tp('seller.reviews', p.reviews) : t('seller.noReviews')}
        />
        {value && value.counted > 0 && <StatTile highlight label={t('coll.value')} value={money(value.total)} sub={t('coll.valueSub', { n: value.counted })} />}
        <StatTile label={t('coll.statShirts')} value={collection.data?.length ?? '–'} />
        <StatTile label={t('seller.sales')} value={p.sales} />
        <StatTile label={t('seller.shipTime')} value={p.avg_ship_days === null ? t('seller.na') : t('seller.days', { n: Math.max(1, Math.ceil(Number(p.avg_ship_days))) })} />
      </div>


      <section aria-labelledby="reviews-title" style={{ marginTop: 40, maxWidth: 760 }}>
        <h2 id="reviews-title" className="title">
          {t('seller.reviewsTitle')}
        </h2>
        {!reviews.data?.length && !reviews.isLoading && <p style={{ color: 'var(--muted)', fontSize: 14 }}>{t('seller.noReviews')}</p>}
        <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
          {(reviews.data ?? []).map((r, i) => (
            <Card key={i} tight>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <Stars value={r.rating} label={t('seller.stars', { n: r.rating })} />
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {r.shirt_id && BY[r.shirt_id] ? BY[r.shirt_id]!.name + ' · ' : ''}
                  {formatDate(r.created_at, lang)}
                </span>
              </div>
              {r.comment && <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.55, color: 'var(--text-2)' }}>{r.comment}</p>}
            </Card>
          ))}
        </div>
      </section>
    </Page>
  );
}
