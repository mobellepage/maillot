// /u/:handle — a member's public page: the shirts they show (visibility other
// than private, for sale ones marked), track record and reviews. Only what the
// member chose to make public plus facts from completed orders.
import { useParams } from 'react-router';
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
import { LevelBadge } from '../levels/LevelBadge.tsx';
import { FollowButton } from '../collectors/FollowButton.tsx';
import { DealerBadge } from '../collectors/DealerBadge.tsx';
import { publicCollectionValue } from '../collectors/collectionValue.ts';
import { useSession } from '../../lib/session.tsx';
import { Avatar } from '../avatars/Avatar.tsx';

export default function SellerPage() {
  useCatalog();
  const { handle = '' } = useParams();
  const { t, tp, money, lang } = usePrefs();
  const profile = useQuery({ queryKey: ['seller', handle], queryFn: () => db.loadSellerProfile(handle) });
  const reviews = useQuery({ queryKey: ['sellerReviews', handle], queryFn: () => db.loadSellerReviews(handle), enabled: !!profile.data });
  const collection = useQuery({ queryKey: ['publicCollection', handle], queryFn: () => db.loadPublicCollection(handle), enabled: !!profile.data });
  const { user } = useSession();
  const stats = useQuery({ queryKey: ['collectorStats', handle.toLowerCase(), user?.id], queryFn: () => db.loadCollectorStats(handle), enabled: !!profile.data });
  const value = stats.data?.show_value && collection.data ? publicCollectionValue(collection.data) : null;
  usePageMeta(t('seller.meta', { handle }), t('seller.metaDesc', { handle }));

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div aria-hidden="true" style={{ width: 80, height: 80, borderRadius: '50%', border: '3px solid var(--accent)', padding: 4, flex: 'none' }}>
          <Avatar avatar={stats.data?.avatar} name={p.handle} size={66} ring={false} style={{ width: '100%', height: '100%' }} />
        </div>
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="eyebrow">{stats.data?.dealer ? t('dealer.eyebrow') : t('seller.eyebrow')}</span>
            {stats.data?.dealer && <DealerBadge />}
            {!!collection.data?.length && <LevelBadge shirts={collection.data.length} value={value?.total ?? 0} />}
          </div>
          <h1 className="display" style={{ fontSize: p.handle.length > 14 ? 'clamp(18px,5vw,40px)' : 'clamp(28px,4vw,44px)', margin: '6px 0 0', overflowWrap: 'anywhere' }}>
            @{p.handle}
          </h1>
          <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 6 }}>{t('seller.since', { date: formatDate(p.member_since, lang) })}</div>
          {stats.data && (
            <div style={{ fontSize: 13.5, color: 'var(--text-2)', marginTop: 4 }}>
              {tp('coll.followers', stats.data.followers)} · {t('coll.followingCount', { n: stats.data.following })}
            </div>
          )}
        </div>
        <FollowButton handle={p.handle} stats={stats.data ?? undefined} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginTop: 28 }}>
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

      <section aria-labelledby="collection-title" style={{ marginTop: 40 }}>
        <h2 id="collection-title" className="title">
          {t('coll.title')} <span className="mono" style={{ color: 'var(--muted)', fontSize: 13 }}>{collection.data?.length ?? ''}</span>
        </h2>
        {collection.isLoading && <Skeleton height={220} radius={20} style={{ marginTop: 14 }} />}
        {collection.isError && <ErrorState compact what={t('coll.title')} onRetry={() => collection.refetch()} />}
        {collection.data && !collection.data.length && <p style={{ color: 'var(--muted)', fontSize: 14 }}>{stats.data?.collection_private ? (stats.data.is_me ? t('coll.privateMine') : t('coll.privateOther')) : t('coll.empty')}</p>}
        {!!collection.data?.length && <PublicCollection shirts={collection.data} owner={p.handle} canOffer={!stats.data?.is_me} />}
      </section>

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
