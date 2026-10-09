// /u/:handle — a member's public page: the shirts they show (visibility other
// than private), track record, reviews and live listings. Only what the
// member chose to make public plus facts from completed orders.
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { BY } from '../../data.ts';
import { formatDate } from '../../lib/format.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import * as db from '../../utils/db.ts';
import { useCatalog } from '../catalog/useCatalog.ts';
import { Card, EmptyState, ErrorState, Page, ShirtGraphic, Skeleton, StatTile } from '../../ui/index.ts';
import { Stars } from '../../ui/Stars.tsx';
import { PublicCollection } from '../collectors/PublicCollection.tsx';
import { FollowButton } from '../collectors/FollowButton.tsx';
import { publicCollectionValue } from '../collectors/collectionValue.ts';
import { useSession } from '../../lib/session.tsx';

export default function SellerPage() {
  useCatalog();
  const { handle = '' } = useParams();
  const { t, tp, money, lang, label } = usePrefs();
  const profile = useQuery({ queryKey: ['seller', handle], queryFn: () => db.loadSellerProfile(handle) });
  const listings = useQuery({ queryKey: ['sellerListings', handle], queryFn: () => db.loadSellerListings(handle), enabled: !!profile.data });
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

  const pct = (x: number | null) => (x === null ? t('seller.na') : Math.round(x * 100) + '%');
  return (
    <Page>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div aria-hidden="true" style={{ width: 80, height: 80, borderRadius: '50%', border: '3px solid var(--accent)', padding: 4, flex: 'none' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--avatar-grad)', display: 'grid', placeItems: 'center', fontSize: 24, fontWeight: 800 }}>{p.handle.slice(0, 2).toUpperCase()}</div>
        </div>
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <div className="eyebrow">{t('seller.eyebrow')}</div>
          <h1 className="display" style={{ fontSize: 'clamp(28px,4vw,44px)', margin: '6px 0 0' }}>
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
        <StatTile label={t('seller.passRate')} value={pct(p.pass_rate === null ? null : Number(p.pass_rate))} />
        <StatTile label={t('seller.shipTime')} value={p.avg_ship_days === null ? t('seller.na') : t('seller.days', { n: Math.max(1, Math.ceil(Number(p.avg_ship_days))) })} />
      </div>

      <section aria-labelledby="collection-title" style={{ marginTop: 40 }}>
        <h2 id="collection-title" className="title">
          {t('coll.title')} <span className="mono" style={{ color: 'var(--muted)', fontSize: 13 }}>{collection.data?.length ?? ''}</span>
        </h2>
        {collection.isLoading && <Skeleton height={220} radius={20} style={{ marginTop: 14 }} />}
        {collection.isError && <ErrorState compact what={t('coll.title')} onRetry={() => collection.refetch()} />}
        {collection.data && !collection.data.length && <p style={{ color: 'var(--muted)', fontSize: 14 }}>{t('coll.empty')}</p>}
        {!!collection.data?.length && <PublicCollection shirts={collection.data} />}
      </section>

      <section aria-labelledby="listings-title" style={{ marginTop: 40 }}>
        <h2 id="listings-title" className="title">
          {t('seller.listings')} <span className="mono" style={{ color: 'var(--muted)', fontSize: 13 }}>{p.listings}</span>
        </h2>
        {!listings.data?.length && !listings.isLoading && <p style={{ color: 'var(--muted)', fontSize: 14 }}>{t('seller.noListings')}</p>}
        <ul className="grid-cards" style={{ listStyle: 'none', padding: 0, margin: '14px 0 0' }}>
          {(listings.data ?? []).map((l) => {
            const s = BY[l.shirt_id];
            if (!s) return null;
            return (
              <li key={l.ask_id} className="card card--interactive" style={{ padding: 16, borderRadius: 20, position: 'relative' }}>
                <div style={{ aspectRatio: '1/1', display: 'grid', placeItems: 'center' }}>
                  <ShirtGraphic pat={s.pat} trim={s.trim} crest={s.crest} flat style={{ width: '70%' }} />
                </div>
                <Link to={`/shirt/${s.id}?size=${encodeURIComponent(l.size)}`} className="stretched-link" style={{ display: 'block', color: 'var(--text)', fontWeight: 600, fontSize: 14.5, marginTop: 8 }}>
                  {s.name}
                </Link>
                <div className="mono" style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
                  {t('seller.sizeAsk', { size: l.size, price: money(Number(l.amount)) })}
                  {l.condition ? ' · ' + label('cond', l.condition) : ''}
                </div>
              </li>
            );
          })}
        </ul>
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
