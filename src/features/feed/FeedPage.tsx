// /feed — scroll through shirts one screen at a time: live listings from
// different sellers (with their own photos) and catalogue shirts in between.
// Like with the heart or a double tap; a like puts the shirt on the
// watchlist. Order: features/feed/compose.ts.
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type RefObject } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { BY, SHIRTS } from '../../data.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { usePhotoUrls } from '../../lib/usePhotoUrls.ts';
import { loadJSON, saveJSON } from '../../utils/storage.ts';
import * as db from '../../utils/db.ts';
import type { Photo } from '../../types/domain.ts';
import { ButtonLink, HeartIcon, ShirtGraphic, alpha } from '../../ui/index.ts';
import { useCatalog } from '../catalog/useCatalog.ts';
import { marketValue } from '../catalog/model.ts';
import { DealerBadge } from '../collectors/DealerBadge.tsx';
import { useWatchlist } from '../watchlist/useWatchlist.ts';
import { composeFeed, type FeedItem } from './compose.ts';

const SEEN_KEY = 'kv_feed_seen';
const BATCH = 12;

/** The scroller fills the screen between the header and the phone's bottom bar. */
function useFeedHeight(ref: RefObject<HTMLElement | null>) {
  const [h, setH] = useState(600);
  useEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const nav = document.querySelector<HTMLElement>('nav.show-mobile');
      const navH = nav && getComputedStyle(nav).display !== 'none' ? nav.offsetHeight : 0;
      setH(Math.max(420, window.innerHeight - el.getBoundingClientRect().top - navH));
    };
    window.scrollTo(0, 0);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [ref]);
  return h;
}

function FeedCard({ item, height, photoUrl, liked, onLike, onSeen }: { item: FeedItem; height: number; photoUrl: string | undefined; liked: boolean; onLike: (like: boolean) => void; onSeen: () => void }) {
  const { t, money, label } = usePrefs();
  const s = BY[item.shirtId];
  const ref = useRef<HTMLElement>(null);
  const lastTap = useRef(0);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e?.isIntersecting && onSeen(), { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [onSeen]);

  if (!s) return null;
  const l = item.kind === 'listing' ? item.listing : null;
  const size = l?.size;
  const href = '/shirt/' + s.id + (size ? '?size=' + encodeURIComponent(size) : '');
  // Double tap (or double click) on the picture likes — never unlikes — and shows a heart.
  const likeByTap = () => {
    if (!liked) onLike(true);
    setBurst((b) => b + 1);
  };
  // Touch screens: our own double-tap timing (no dblclick there).
  const tap = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    const now = Date.now();
    if (now - lastTap.current < 300) {
      likeByTap();
      lastTap.current = 0;
    } else lastTap.current = now;
  };
  const media = Math.min(height * 0.62, 560);

  return (
    <article ref={ref} className="feed-item" aria-label={s.name} style={{ height, background: '#0A0C0B' }}>
      <div
        onPointerUp={tap}
        onDoubleClick={likeByTap}
        style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'start center', paddingTop: 16, background: `radial-gradient(circle at 50% 34%,${alpha(s.glow, 0.28)},rgba(0,0,0,0) 58%)`, touchAction: 'manipulation', userSelect: 'none' }}
      >
        <div style={{ width: media, maxWidth: '100%', aspectRatio: '1/1', display: 'grid', placeItems: 'center', borderRadius: 24, overflow: 'hidden' }}>
          {l && photoUrl ? (
            <img src={photoUrl} alt="" draggable={false} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <ShirtGraphic hero pat={s.pat} trim={s.trim} crest={s.crest} photo={s.photo} style={{ width: '70%' }} />
          )}
        </div>
        {burst > 0 && (
          <span key={burst} aria-hidden="true" style={{ position: 'absolute', top: 16 + media / 2 - 60, left: '50%', marginLeft: -60, color: 'var(--accent)', animation: 'kvHeart .8s ease both', pointerEvents: 'none' }}>
            <HeartIcon size={120} filled />
          </span>
        )}
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '48px 20px 20px', background: 'linear-gradient(180deg,rgba(10,12,11,0) 0%,rgba(10,12,11,0.92) 34%)' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', gap: 16, alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-2)' }}>
              {l ? (
                <>
                  {l.handle ? <Link to={'/u/' + l.handle}>@{l.handle}</Link> : <span>{t('seller.newSeller')}</span>}
                  {l.dealer && <DealerBadge compact />}
                </>
              ) : (
                <span className="mono" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                  {t('feed.catalog')}
                </span>
              )}
            </div>
            <h2 style={{ margin: '6px 0 0', fontSize: 'clamp(19px,4.6vw,24px)', fontWeight: 700, lineHeight: 1.2 }}>{s.name}</h2>
            <div className="mono" style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 6 }}>
              {(l ? [t('alert.thisSize', { size: l.size }), l.condition && label('cond', l.condition), l.edition && label('edition', l.edition), l.player] : [s.brand, s.season]).filter(Boolean).join(' · ')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
              <span className="mono" style={{ fontSize: 22, fontWeight: 700 }}>
                {l ? money(l.amount) : money(marketValue(s, 'M'))}
              </span>
              {!l && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{t('common.marketValue')}</span>}
              <ButtonLink to={href} size="sm" variant={l ? 'primary' : 'secondary'} style={{ marginLeft: 'auto' }}>
                {l ? t('feed.buy') : t('feed.view')}
              </ButtonLink>
            </div>
          </div>
          <button
            type="button"
            aria-pressed={liked}
            aria-label={liked ? t('feed.unlike', { name: s.name }) : t('feed.like', { name: s.name })}
            onClick={() => onLike(!liked)}
            style={{ flex: 'none', width: 60, display: 'grid', justifyItems: 'center', gap: 4, background: 'none', border: 0, color: liked ? 'var(--accent)' : 'var(--text)', cursor: 'pointer', padding: 0 }}
          >
            <span style={{ width: 56, height: 56, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)' }}>
              <HeartIcon size={26} filled={liked} />
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{liked ? t('feed.liked') : t('feed.likeShort')}</span>
          </button>
        </div>
      </div>
    </article>
  );
}

export default function FeedPage() {
  useCatalog();
  const { t } = usePrefs();
  usePageMeta(t('feed.metaTitle'), t('feed.metaDesc'));
  const watch = useWatchlist();
  const scroller = useRef<HTMLDivElement>(null);
  const height = useFeedHeight(scroller);
  const [shown, setShown] = useState(BATCH);

  // Composed once per visit, from the likes known at that moment: likes made
  // while scrolling don't reshuffle what's ahead. Without listings (offline,
  // none yet) the catalogue still fills the feed.
  const feed = useQuery({
    queryKey: ['feed'],
    queryFn: async () =>
      composeFeed({
        listings: await db.loadFeedListings().catch(() => []),
        catalog: SHIRTS.map((s) => ({ id: s.id, club: s.club, league: s.league, type: s.type })),
        liked: watch.ids,
        seen: new Set(loadJSON<string[]>(SEEN_KEY, []))
      }),
    staleTime: Infinity,
    gcTime: 60 * 1000
  });
  const items = feed.data ?? null;

  // One signing request for every listing's front photo.
  const fronts = useMemo(
    () =>
      (items ?? []).map((i): Photo | undefined => {
        if (i.kind !== 'listing') return undefined;
        const p = i.listing.photos.find((x) => x.kind === 'front') ?? i.listing.photos[0];
        return p && { path: p.path };
      }),
    [items]
  );
  const url = usePhotoUrls(fronts);

  const seenRef = useRef<Set<string>>(new Set(loadJSON<string[]>(SEEN_KEY, [])));
  const seen = useCallback((item: FeedItem, index: number) => {
    seenRef.current.add(item.key);
    saveJSON(SEEN_KEY, [...seenRef.current].slice(-500));
    setShown((n) => (index >= n - 3 ? n + BATCH : n));
  }, []);

  return (
    <main id="main" tabIndex={-1} style={{ maxWidth: 1360, margin: '0 auto', outline: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: '1px solid var(--line)' }}>
        <h1 className="mono" style={{ margin: 0, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)' }}>
          {t('feed.title')}
        </h1>
        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{t('feed.hint')}</span>
        <Link to="/watchlist" style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
          <HeartIcon size={13} filled style={{ color: 'var(--accent)' }} />
          {watch.ids.length}
        </Link>
      </div>
      <div ref={scroller} className="feed" tabIndex={0} aria-label={t('feed.aria')} style={{ height }}>
        {!items && <div className="feed-item" style={{ height, display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>{t('common.loading')}</div>}
        {(items ?? []).slice(0, shown).map((item, i) => (
          <FeedCard key={item.key} item={item} height={height} photoUrl={url(fronts[i])} liked={watch.has(item.shirtId)} onLike={(like) => like !== watch.has(item.shirtId) && watch.toggle(item.shirtId)} onSeen={() => seen(item, i)} />
        ))}
      </div>
    </main>
  );
}
