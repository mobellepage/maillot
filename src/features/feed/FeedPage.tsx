// /feed — shirts as a stack of cards, one at a time: swipe right to like
// (it goes on your wishlist), left to pass. The ✕ / ♥ buttons and the
// arrow keys do the same; "Back" undoes the last decision. For now the
// cards are kits of the library (FEED_SOURCE); with the market on, live
// listings from different sellers come first and catalogue shirts fill in
// (order: features/feed/compose.ts).
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { Link, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { BY, SHIRTS } from '../../data.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { usePhotoUrls } from '../../lib/usePhotoUrls.ts';
import { loadJSON, saveJSON } from '../../utils/storage.ts';
import * as db from '../../utils/db.ts';
import type { Photo } from '../../types/domain.ts';
import { Button, ButtonLink, CloseIcon, HeartIcon, ShirtGraphic, alpha } from '../../ui/index.ts';
import { useCatalog } from '../catalog/useCatalog.ts';
import { marketValue } from '../catalog/model.ts';
import { DealerBadge } from '../collectors/DealerBadge.tsx';
import { useWatchlist } from '../watchlist/useWatchlist.ts';
import { useKitLikes } from '../watchlist/useKitLikes.ts';
import { FEED_SOURCE } from '../../config/rules.ts';
import { variantLabel } from '../library/model.ts';
import { composeFeed, type FeedItem } from './compose.ts';

const SEEN_KEY = 'kv_feed_seen';
/** How far (px) a card must travel to count as a decision. */
const THRESHOLD = 110;

/** The stack fills the screen between the header and the phone's bottom bar. */
function useFeedHeight(ref: RefObject<HTMLElement | null>) {
  const [h, setH] = useState(600);
  useEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const nav = document.querySelector<HTMLElement>('nav.show-mobile');
      const navH = nav && getComputedStyle(nav).display !== 'none' ? nav.offsetHeight : 0;
      setH(Math.max(460, window.innerHeight - el.getBoundingClientRect().top - navH));
    };
    window.scrollTo(0, 0);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [ref]);
  return h;
}

const href = (item: FeedItem) =>
  item.kind === 'kit' ? '/library/' + item.kit.club_id + '#season-' + item.kit.season : '/shirt/' + item.shirtId + (item.kind === 'listing' ? '?size=' + encodeURIComponent(item.listing.size) : '');

/** A kit of the library: its picture on light, club, season and kind. */
function KitFace({ kit }: { kit: Extract<FeedItem, { kind: 'kit' }>['kit'] }) {
  const { t } = usePrefs();
  const variant = variantLabel(kit.variant, t);
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'radial-gradient(circle at 50% 36%,#FFFFFF,#ECEEEA 70%)' }}>
        {kit.image_path && <img src={kit.image_path} alt="" draggable={false} style={{ width: '78%', maxHeight: '64%', objectFit: 'contain', marginBottom: '26%', filter: 'drop-shadow(0 18px 24px rgba(0,0,0,.18))' }} />}
      </div>
      <div className="feed-caption" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '60px 20px 20px', color: '#F2F4F1', background: 'linear-gradient(180deg,rgba(10,12,11,0) 0%,rgba(10,12,11,0.94) 38%)' }}>
        <span style={{ fontSize: 12, color: '#A8B0AA' }}>
          {t('feed.library')} · {kit.league === 'National Teams' ? t('lib.nations') : kit.league}
        </span>
        <h2 style={{ margin: '6px 0 0', fontSize: 22, fontWeight: 700, lineHeight: 1.2, color: '#F2F4F1' }}>
          {kit.club_name} {kit.season}
        </h2>
        <div style={{ fontSize: 13, color: '#C9D0CB', marginTop: 6 }}>
          {t('lib.kind.' + kit.kind)}
          {variant && ' · ' + variant}
        </div>
      </div>
    </>
  );
}

/** One card's face: picture and what you need to decide. */
function CardFace({ item, photoUrl }: { item: FeedItem; photoUrl: string | undefined }) {
  const { t, money, label } = usePrefs();
  if (item.kind === 'kit') return <KitFace kit={item.kit} />;
  const s = BY[item.shirtId]!;
  const l = item.kind === 'listing' ? item.listing : null;
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: `radial-gradient(circle at 50% 36%,${alpha(s.glow, 0.3)},rgba(0,0,0,0) 60%),var(--feed-card, #0A0C0B)` }}>
        {l && photoUrl ? (
          <img src={photoUrl} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '82%', aspectRatio: '1/1', marginBottom: '28%', display: 'grid', placeItems: 'center', borderRadius: 22, overflow: 'hidden' }}>
            <ShirtGraphic hero pat={s.pat} trim={s.trim} crest={s.crest} photo={s.photo} style={{ width: '72%' }} />
          </div>
        )}
      </div>
      <div className="feed-caption" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '60px 20px 20px', color: '#F2F4F1', background: 'linear-gradient(180deg,rgba(10,12,11,0) 0%,rgba(10,12,11,0.94) 38%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13, color: '#C9D0CB' }}>
          {l ? (
            <>
              <span>{l.handle ? '@' + l.handle : t('seller.newSeller')}</span>
              {l.dealer && <DealerBadge compact />}
            </>
          ) : (
            <span style={{ fontSize: 12, color: '#A8B0AA' }}>{t('feed.catalog')}</span>
          )}
        </div>
        <h2 style={{ margin: '6px 0 0', fontSize: 22, fontWeight: 700, lineHeight: 1.2, color: '#F2F4F1' }}>{s.name}</h2>
        <div style={{ fontSize: 13, color: '#C9D0CB', marginTop: 6 }}>
          {(l ? [t('alert.thisSize', { size: l.size }), l.condition && label('cond', l.condition), l.edition && label('edition', l.edition), l.player] : [s.brand, s.season]).filter(Boolean).join(' · ')}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
          <span className="mono" style={{ fontSize: 24, fontWeight: 700 }}>
            {l ? money(l.amount) : money(marketValue(s, 'M'))}
          </span>
          {!l && <span style={{ fontSize: 12, color: '#A8B0AA' }}>{t('common.marketValue')}</span>}
        </div>
      </div>
    </>
  );
}

export default function FeedPage() {
  useCatalog();
  const { t } = usePrefs();
  usePageMeta(t('feed.metaTitle'), t('feed.metaDesc'));
  const watch = useWatchlist();
  const kitLikes = useKitLikes();
  const liked = watch.ids.length + kitLikes.kits.length;
  const { user, profile } = useSession();
  const navigate = useNavigate();
  const stage = useRef<HTMLDivElement>(null);
  const height = useFeedHeight(stage);

  // Composed once per visit, from the likes known at that moment.
  const feed = useQuery({
    queryKey: ['feed', user?.id],
    // Wait for the member's profile so their interests shape the first cards.
    enabled: profile !== undefined,
    queryFn: async () => {
      const library = FEED_SOURCE === 'library';
      const fav = profile?.interests.club;
      const kits = library
        ? // Without the library (offline, throttled) the catalogue fills in.
          await db.loadFeedKits([...new Set([...(fav ? [fav] : []), ...kitLikes.kits.map((k) => k.club_id)])].slice(0, 20), [...new Set([...(profile?.interests.leagues ?? []), ...kitLikes.kits.map((k) => k.league)])].slice(0, 10)).catch(() => [])
        : [];
      return composeFeed({
        listings: library ? [] : await db.loadFeedListings().catch(() => []),
        kits,
        likedKits: kitLikes.kits,
        catalog: SHIRTS.map((s) => ({ id: s.id, club: s.club, league: s.league, type: s.type })),
        liked: watch.ids,
        seen: new Set(loadJSON<string[]>(SEEN_KEY, [])),
        interests: profile?.interests
      });
    },
    staleTime: Infinity,
    gcTime: 60 * 1000
  });
  const items = (feed.data ?? []).filter((i) => i.kind === 'kit' || BY[i.shirtId]);
  const titleOf = (i: FeedItem) => (i.kind === 'kit' ? `${i.kit.club_name} ${i.kit.season} · ${t('lib.kind.' + i.kit.kind)}` : BY[i.shirtId]!.name);
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<{ item: FeedItem; liked: boolean }[]>([]);
  const [pulse, setPulse] = useState(0);
  // The drag runs outside React: the card, the card behind and the stamps are
  // moved directly, once per animation frame — no re-render while swiping.
  const card = useRef<HTMLDivElement>(null);
  const behind = useRef<HTMLDivElement>(null);
  const likeStamp = useRef<HTMLSpanElement>(null);
  const nopeStamp = useRef<HTMLSpanElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const offset = useRef({ x: 0, y: 0 });
  const frame = useRef(0);
  const leaving = useRef(false);

  const paint = (x: number, y: number, animate: boolean, gone = false) => {
    const ease = animate ? 'transform .24s ease-out, opacity .24s ease-out' : 'none';
    if (card.current) {
      card.current.style.transition = ease;
      card.current.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${x / 18}deg)`;
      card.current.style.opacity = gone ? '0' : '1';
    }
    if (behind.current) {
      behind.current.style.transition = animate ? 'transform .24s ease-out' : 'none';
      behind.current.style.transform = `scale(${0.94 + Math.min(Math.abs(x) / THRESHOLD, 1) * 0.06})`;
    }
    if (likeStamp.current) likeStamp.current.style.opacity = String(Math.max(0, Math.min(1, x / THRESHOLD)));
    if (nopeStamp.current) nopeStamp.current.style.opacity = String(Math.max(0, Math.min(1, -x / THRESHOLD)));
  };
  const fronts = items.map((i): Photo | undefined => {
    if (i.kind !== 'listing') return undefined;
    const p = i.listing.photos.find((x) => x.kind === 'front') ?? i.listing.photos[0];
    return p && { path: p.path };
  });
  const url = usePhotoUrls(fronts.slice(index, index + 3));

  const current = items[index];
  const next = items[index + 1];

  const decide = (like: boolean) => {
    const item = items[index];
    if (!item || leaving.current) return;
    leaving.current = true;
    if (like) {
      if (item.kind === 'kit') {
        if (!kitLikes.has(item.kit.id)) kitLikes.toggle(item.kit);
      } else if (!watch.has(item.shirtId)) watch.toggle(item.shirtId, { quiet: true });
      setPulse((p) => p + 1);
    }
    const seen = new Set(loadJSON<string[]>(SEEN_KEY, []));
    seen.add(item.key);
    saveJSON(SEEN_KEY, [...seen].slice(-500));
    // Let the card fly out, then show the next one.
    paint(like ? window.innerWidth : -window.innerWidth, offset.current.y * 0.3, true, true);
    window.setTimeout(() => {
      setHistory((h) => [...h, { item, liked: like }]);
      setIndex((i) => i + 1);
      offset.current = { x: 0, y: 0 };
      leaving.current = false;
    }, 240);
  };

  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    if (last.liked) {
      if (last.item.kind === 'kit') {
        if (kitLikes.has(last.item.kit.id)) kitLikes.toggle(last.item.kit);
      } else if (watch.has(last.item.shirtId)) watch.toggle(last.item.shirtId, { quiet: true });
    }
    setHistory((h) => h.slice(0, -1));
    setIndex((i) => Math.max(0, i - 1));
  };

  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (leaving.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY };
    offset.current = { x: 0, y: 0 };
    e.currentTarget.style.cursor = 'grabbing';
  };
  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    offset.current = { x: e.clientX - start.current.x, y: e.clientY - start.current.y };
    if (!frame.current)
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        if (start.current) paint(offset.current.x, offset.current.y * 0.3, false);
      });
  };
  const up = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    start.current = null;
    e.currentTarget.style.cursor = 'grab';
    const { x, y } = offset.current;
    if (x > THRESHOLD) decide(true);
    else if (x < -THRESHOLD) decide(false);
    // A tap (no real drag) opens the shirt.
    else if (Math.abs(x) < 6 && Math.abs(y) < 6 && current) navigate(href(current));
    else paint(0, 0, true);
  };

  const cardH = Math.min(height - 120, 640);
  const done = feed.data && !current;

  return (
    <main
      id="main"
      tabIndex={-1}
      // Arrow keys decide too (keyboard users; focus is on the page or a button in it).
      onKeyDown={(e) => {
        if ((e.target as HTMLElement).closest('input,textarea,select')) return;
        if (e.key === 'ArrowRight') decide(true);
        else if (e.key === 'ArrowLeft') decide(false);
      }}
      style={{ maxWidth: 1360, margin: '0 auto', outline: 'none' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: '1px solid var(--line)' }}>
        <h1 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{t('feed.title')}</h1>
        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{t('feed.hint')}</span>
        <Link to="/watchlist" aria-label={t('feed.wishlistCount', { n: liked })} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span key={pulse} style={{ display: 'inline-flex', animation: pulse ? 'kvHeart .5s ease' : undefined }}>
            <HeartIcon size={14} filled style={{ color: 'var(--accent)' }} />
          </span>
          {liked}
        </Link>
      </div>

      <div ref={stage} style={{ height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '12px 16px', overflow: 'hidden' }}>
        {!feed.data && <p style={{ color: 'var(--muted)' }}>{t('common.loading')}</p>}

        {done && (
          <div style={{ textAlign: 'center', maxWidth: 360 }}>
            <HeartIcon size={40} filled style={{ color: 'var(--accent)' }} />
            <h2 style={{ fontSize: 22, margin: '12px 0 6px' }}>{t('feed.doneTitle')}</h2>
            <p style={{ color: 'var(--text-2)', lineHeight: 1.5, margin: 0 }}>{t('feed.doneBody', { n: liked })}</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 18, flexWrap: 'wrap' }}>
              <ButtonLink to="/watchlist">{t('feed.viewWishlist')}</ButtonLink>
              <Button
                variant="secondary"
                onClick={() => {
                  setIndex(0);
                  setHistory([]);
                  feed.refetch();
                }}
              >
                {t('feed.again')}
              </Button>
            </div>
          </div>
        )}

        {current && (
          <>
            <div style={{ position: 'relative', width: 'min(100%, 420px)', height: cardH }}>
              {next && (
                <div key={next.key} ref={behind} aria-hidden="true" style={{ position: 'absolute', inset: 0, borderRadius: 26, overflow: 'hidden', transform: 'scale(0.94)', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}>
                  <CardFace item={next} photoUrl={url(fronts[index + 1])} />
                </div>
              )}
              <div
                key={current.key}
                ref={card}
                role="group"
                aria-roledescription={t('feed.card')}
                aria-label={titleOf(current)}
                onPointerDown={down}
                onPointerMove={move}
                onPointerUp={up}
                onPointerCancel={up}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 26,
                  overflow: 'hidden',
                  cursor: 'grab',
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
                  willChange: 'transform'
                }}
              >
                <CardFace item={current} photoUrl={url(fronts[index])} />
                <span ref={likeStamp} aria-hidden="true" style={{ position: 'absolute', top: 24, left: 20, padding: '6px 14px', borderRadius: 10, border: '3px solid #4BFF8B', color: '#4BFF8B', fontWeight: 800, fontSize: 22, transform: 'rotate(-14deg)', opacity: 0 }}>
                  {t('feed.stampLike')}
                </span>
                <span ref={nopeStamp} aria-hidden="true" style={{ position: 'absolute', top: 24, right: 20, padding: '6px 14px', borderRadius: 10, border: '3px solid #FF6B5E', color: '#FF6B5E', fontWeight: 800, fontSize: 22, transform: 'rotate(14deg)', opacity: 0 }}>
                  {t('feed.stampNope')}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <button type="button" className="icon-btn" aria-label={t('feed.undo')} disabled={!history.length} onClick={undo} style={{ width: 48, height: 48, borderRadius: '50%', fontSize: 18 }}>
                ↺
              </button>
              <button type="button" aria-label={t('feed.skip', { name: titleOf(current) })} onClick={() => decide(false)} style={{ width: 64, height: 64, borderRadius: '50%', border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--neg)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                <CloseIcon size={26} />
              </button>
              <button type="button" aria-label={t('feed.like', { name: titleOf(current) })} onClick={() => decide(true)} style={{ width: 64, height: 64, borderRadius: '50%', border: 0, background: 'var(--accent-fill)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                <HeartIcon size={26} filled />
              </button>
              <Link to={href(current)} className="icon-btn" aria-label={t('feed.details', { name: titleOf(current) })} style={{ width: 48, height: 48, borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
                i
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
