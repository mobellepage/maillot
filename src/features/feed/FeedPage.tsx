// /feed — shirts as a stack of cards, one at a time: swipe right to like,
// left to pass. The ✕ / ♥ buttons and the arrow keys do the same; "Back"
// undoes the last decision. News from collections comes first — a shirt
// added, put up for sale, opened to offers, made cheaper, verified; those
// matching the wishlist before the rest — then kits of the library
// fill in (order: features/feed/compose.ts).
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
import { useWatchlist } from '../watchlist/useWatchlist.ts';
import { useKitLikes } from '../watchlist/useKitLikes.ts';
import { SHOW_DEMO_EXEMPLARS } from '../../config/rules.ts';
import { demoEvents, estimate, fromEventRow, isReservation, orderEvents, type FeedEvent } from '../market/exemplars/model.ts';
import { OfferButton } from '../collectors/OfferButton.tsx';
import { InquiryButton } from '../collectors/InquiryButton.tsx';
import { isCutoutPath } from '../vault/addshirt/studio.ts';
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

const exemplarHref = (ev: FeedEvent) => (ev.exemplar.demo ? (ev.exemplar.catalogId ? '/shirt/' + ev.exemplar.catalogId : '/market') : '/u/' + ev.exemplar.owner + '/' + encodeURIComponent(ev.exemplar.id));
const href = (item: FeedItem) =>
  item.kind === 'kit' ? '/library/' + item.kit.club_id + '#season-' + item.kit.season : item.kind === 'exemplar' ? exemplarHref(item.event) : '/shirt/' + item.shirtId;

/** Buttons on a card must not start a swipe. */
const stop = { onPointerDown: (e: ReactPointerEvent) => e.stopPropagation(), onPointerUp: (e: ReactPointerEvent) => e.stopPropagation() };

/** News from a collection: the owner's photo, what happened, the shirt and what you can do. */
function ExemplarFace({ event, photoUrl, watched, toggleWatch }: { event: FeedEvent; photoUrl: string | undefined; watched: boolean; toggleWatch: () => void }) {
  const { t, money } = usePrefs();
  const e = event.exemplar;
  const s = e.catalogId ? BY[e.catalogId] : undefined;
  const est = estimate(e);
  const what =
    event.kind === 'price_drop' && event.oldPrice !== null && event.newPrice !== null
      ? t('fe.price_drop', { handle: e.owner, old: money(event.oldPrice), price: money(event.newPrice) })
      : t('fe.' + event.kind, { handle: e.owner });
  const cutout = isCutoutPath(e.photo?.path);
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: photoUrl && !cutout ? '#0A0C0B' : s ? `radial-gradient(circle at 50% 36%,${alpha(s.glow, 0.3)},rgba(0,0,0,0) 60%),var(--feed-card, #0A0C0B)` : 'var(--kit-tile)' }}>
        {photoUrl ? (
          <img src={photoUrl} alt="" draggable={false} style={cutout ? { width: '74%', maxHeight: '62%', objectFit: 'contain', marginBottom: '28%' } : { width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : e.kitImage ? (
          <img src={e.kitImage} alt="" draggable={false} style={{ width: 'min(78%, 270px)', maxHeight: '60%', objectFit: 'contain', marginBottom: '30%' }} />
        ) : s ? (
          <div style={{ width: '82%', aspectRatio: '1/1', marginBottom: '30%', display: 'grid', placeItems: 'center' }}>
            <ShirtGraphic hero pat={s.pat} trim={s.trim} crest={s.crest} photo={s.photo} style={{ width: '72%' }} />
          </div>
        ) : null}
        {e.demo && (
          <span className="badge" title={t('mx.demoTitle')} style={{ position: 'absolute', top: 16, left: 16 }}>
            DEMO
          </span>
        )}
      </div>
      <div className="feed-caption" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '70px 20px 18px', color: '#F2F4F1', background: 'linear-gradient(180deg,rgba(10,12,11,0) 0%,rgba(10,12,11,0.95) 34%)' }}>
        <div style={{ fontSize: 12.5, color: '#C9D0CB' }}>{what}</div>
        <h2 style={{ margin: '6px 0 0', fontSize: 21, fontWeight: 700, lineHeight: 1.2, color: '#F2F4F1' }}>{e.name || t('coll.untitled')}</h2>
        <div style={{ fontSize: 13, color: '#C9D0CB', marginTop: 5 }}>
          {[t('mx.version.' + (e.version ?? 'replica')), e.size && t('coll.size', { size: e.size }), e.grade !== null && t('mx.grade', { n: e.grade }), e.print].filter(Boolean).join(' · ')}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: isReservation(e) ? '#FFC24B' : e.status === 'public' ? '#C9D0CB' : '#4BFF8B' }}>{isReservation(e) ? t('mx.reserved') : e.status === 'public' ? t('mx.piece') : t('mx.status.' + e.status)}</span>
          <span className="mono" style={{ fontSize: 20, fontWeight: 700 }}>
            {e.status === 'forsale' && e.price !== null ? money(e.price) : est.value !== null ? money(est.value) : ''}
          </span>
          <span style={{ fontSize: 11.5, color: '#A8B0AA' }}>{e.status === 'forsale' && e.price !== null ? t('mx.price') : est.afterExpert ? t('mx.afterExpert') : est.value !== null ? t('mx.estimate') : ''}</span>
        </div>
        <div {...stop} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
          {s && (
            <button type="button" className="btn btn--secondary btn--sm" aria-pressed={watched} onClick={toggleWatch} style={{ marginTop: 10 }}>
              {watched ? t('ic.watching2') : t('ic.watch')}
            </button>
          )}
          {!e.demo && !isReservation(e) && e.catalogId && e.size && (e.status === 'forsale' || e.status === 'offers') && <OfferButton itemId={e.id} name={e.name} owner={e.owner} suggested={e.status === 'forsale' && e.price !== null ? e.price : est.value ?? undefined} />}
          {!e.demo && e.status === 'public' && e.canAsk && <InquiryButton itemId={e.id} name={e.name} owner={e.owner} />}
        </div>
      </div>
    </>
  );
}

/** A kit of the library: its picture on the kit tile, club, season and kind. */
function KitFace({ kit }: { kit: Extract<FeedItem, { kind: 'kit' }>['kit'] }) {
  const { t } = usePrefs();
  const variant = variantLabel(kit.variant, t);
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'var(--kit-tile)' }}>
        {kit.image_path && <img src={kit.image_path} alt="" draggable={false} style={{ width: 'min(78%, 270px)', maxHeight: '64%', objectFit: 'contain', marginBottom: '26%', filter: 'drop-shadow(0 18px 24px rgba(0,0,0,.18))' }} />}
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
  const { t, money } = usePrefs();
  const watch = useWatchlist();
  if (item.kind === 'kit') return <KitFace kit={item.kit} />;
  if (item.kind === 'exemplar') {
    const id = item.event.exemplar.catalogId;
    return <ExemplarFace event={item.event} photoUrl={photoUrl} watched={!!id && watch.has(id)} toggleWatch={() => id && watch.toggle(id)} />;
  }
  // A catalogue shirt (when the library can't be reached).
  const s = BY[item.shirtId]!;
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: `radial-gradient(circle at 50% 36%,${alpha(s.glow, 0.3)},rgba(0,0,0,0) 60%),var(--feed-card, #0A0C0B)` }}>
        <div style={{ width: '82%', aspectRatio: '1/1', marginBottom: '28%', display: 'grid', placeItems: 'center', borderRadius: 22, overflow: 'hidden' }}>
          <ShirtGraphic hero pat={s.pat} trim={s.trim} crest={s.crest} photo={s.photo} style={{ width: '72%' }} />
        </div>
      </div>
      <div className="feed-caption" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '60px 20px 20px', color: '#F2F4F1', background: 'linear-gradient(180deg,rgba(10,12,11,0) 0%,rgba(10,12,11,0.94) 38%)' }}>
        <span style={{ fontSize: 12, color: '#A8B0AA' }}>{t('feed.catalog')}</span>
        <h2 style={{ margin: '6px 0 0', fontSize: 22, fontWeight: 700, lineHeight: 1.2, color: '#F2F4F1' }}>{s.name}</h2>
        <div style={{ fontSize: 13, color: '#C9D0CB', marginTop: 6 }}>{[s.brand, s.season].join(' · ')}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
          <span className="mono" style={{ fontSize: 24, fontWeight: 700 }}>
            {money(marketValue(s, 'M'))}
          </span>
          <span style={{ fontSize: 12, color: '#A8B0AA' }}>{t('common.marketValue')}</span>
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
      const fav = profile?.interests.club;
      // Without the library (offline, throttled) the catalogue fills in.
      const kits = await db.loadFeedKits([...new Set([...(fav ? [fav] : []), ...kitLikes.kits.map((k) => k.club_id)])].slice(0, 20), [...new Set([...(profile?.interests.leagues ?? []), ...kitLikes.kits.map((k) => k.league)])].slice(0, 10)).catch(() => []);
      // News from collections (real ones, and demo ones until launch), wishlist matches first.
      const real = (await db.loadFeedEvents().catch(() => [])).map(fromEventRow);
      const events = orderEvents(SHOW_DEMO_EXEMPLARS ? [...real, ...demoEvents()] : real, { models: new Set(watch.ids), kits: new Set(kitLikes.kits.map((k) => k.id)) }, new Set(loadJSON<string[]>(SEEN_KEY, [])));
      return composeFeed({
        events,
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
  const items = (feed.data ?? []).filter((i) => i.kind === 'kit' || i.kind === 'exemplar' || BY[i.shirtId]);
  const titleOf = (i: FeedItem) => (i.kind === 'kit' ? `${i.kit.club_name} ${i.kit.season} · ${t('lib.kind.' + i.kit.kind)}` : i.kind === 'exemplar' ? i.event.exemplar.name : BY[i.shirtId]!.name);
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
  const fronts = items.map((i): Photo | undefined => (i.kind === 'exemplar' ? i.event.exemplar.photo : undefined));
  const url = usePhotoUrls(fronts.slice(index, index + 3));

  const current = items[index];
  const next = items[index + 1];

  // Liking a collector's shirt likes that shirt (signed in); a demo shirt, or a visitor, watches the model instead.
  const likeExemplar = (ev: FeedEvent, like: boolean) => {
    const e = ev.exemplar;
    if (!e.demo && user) void db.setItemLike(e.id, like).catch(() => {});
    else if (e.catalogId && watch.has(e.catalogId) !== like) watch.toggle(e.catalogId, { quiet: true });
  };

  const decide = (like: boolean) => {
    const item = items[index];
    if (!item || leaving.current) return;
    leaving.current = true;
    if (like) {
      if (item.kind === 'kit') {
        if (!kitLikes.has(item.kit.id)) kitLikes.toggle(item.kit);
      } else if (item.kind === 'exemplar') likeExemplar(item.event, true);
      else if (!watch.has(item.shirtId)) watch.toggle(item.shirtId, { quiet: true });
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
      } else if (last.item.kind === 'exemplar') likeExemplar(last.item.event, false);
      else if (watch.has(last.item.shirtId)) watch.toggle(last.item.shirtId, { quiet: true });
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
                <div key={next.key} ref={behind} aria-hidden="true" inert style={{ position: 'absolute', inset: 0, borderRadius: 26, overflow: 'hidden', transform: 'scale(0.94)', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}>
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

      {/* The cards as a plain list too: for keyboards, screen readers and search engines. */}
      {items.length > 0 && (
        <details style={{ padding: '6px 20px 28px' }}>
          <summary style={{ cursor: 'pointer', fontSize: 13.5, color: 'var(--text-2)' }}>{t('feed.asList', { n: Math.min(items.length, 24) })}</summary>
          <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0', display: 'grid', gap: 6 }}>
            {items.slice(0, 24).map((i) => (
              <li key={i.key}>
                <Link to={href(i)} style={{ fontSize: 14 }}>
                  {titleOf(i)}
                </Link>
                {i.kind === 'exemplar' && <span style={{ fontSize: 12.5, color: 'var(--muted)' }}> · @{i.event.exemplar.owner}{i.event.exemplar.demo ? ' · DEMO' : ''}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </main>
  );
}
