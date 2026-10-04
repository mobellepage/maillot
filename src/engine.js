import { useEffect, useRef, useState } from 'react';
import { ACC, NEG, BY, SHIRTS, EMPTY, RANGES, SIZES, MULT, CONDS, pct, hexA, down, linePath, uniq, TODAY } from './data.ts';
import { loadJSON, saveJSON } from './utils/storage.ts';
import { estimateValue, matchCatalogFromOcrText } from './addShirtData.js';
import { readLabelText } from './utils/ocr.ts';
import { analyzeAndCompress } from './utils/image.ts';
import { encodeShareData, parseShareHash } from './utils/share.ts';
import { buyerCheckoutFees, sellerPayout } from './fees.ts';
import { useAuth } from './utils/useAuth.ts';
import { supabase } from './utils/supabase.ts';
import * as db from './utils/db.ts';
import { CURRENCIES, loadCachedRates, fetchLiveRates, formatMoney } from './utils/currency.ts';
import { LANGS, translate } from './utils/i18n.ts';
import { pathFor, stateFromPath, titleFor, descriptionFor, PRIVATE_VIEWS } from './utils/router.ts';

const MS = 864e5;

// Coarse German relative-time label for the notification bell.
function timeAgo(iso) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'gerade eben';
  if (min < 60) return 'vor ' + min + ' Min.';
  const h = Math.floor(min / 60);
  if (h < 24) return 'vor ' + h + ' Std.';
  const d = Math.floor(h / 24);
  return 'vor ' + d + (d > 1 ? ' Tagen' : ' Tag');
}
// Signed-out visitors start with an empty watchlist; signing in loads the
// real Supabase-backed one.
const DEMO_WATCH = [];

// Escrow order status \u2192 i18n key/color, used by the Profile "Orders" tab.
// Labels themselves live in utils/i18n.js (order.<status> keys) so they follow
// the viewer's chosen language; this map only carries the status-specific color.
const ORDER_STATUS = {
  pending_payment: { key: 'order.pending_payment', color: '#E8B04B', bg: 'rgba(232,176,75,0.14)' },
  paid_escrow: { key: 'order.paid_escrow', color: '#6FB6FF', bg: 'rgba(111,182,255,0.12)' },
  shipped: { key: 'order.shipped', color: '#6FB6FF', bg: 'rgba(111,182,255,0.12)' },
  delivered: { key: 'order.delivered', color: ACC, bg: 'rgba(75,255,139,0.12)' },
  released: { key: 'order.released', color: ACC, bg: 'rgba(75,255,139,0.12)' },
  disputed: { key: 'order.disputed', color: NEG, bg: 'rgba(255,107,94,0.13)' },
  cancelled: { key: 'order.cancelled', color: '#8C958F', bg: 'rgba(255,255,255,0.06)' },
  refunded: { key: 'order.refunded', color: '#8C958F', bg: 'rgba(255,255,255,0.06)' }
};

function initialState() {
  const shared = typeof window !== 'undefined' ? parseShareHash(window.location.hash) : undefined;
  const routed = shared === undefined && typeof window !== 'undefined' ? stateFromPath(window.location.pathname) : {};
  return {
    view: shared !== undefined ? 'publicvault' : 'home', id: 'ger-26', q: '', heroQ: '', filters: EMPTY, minPrice: 0, maxPrice: 600, sort: 'trending', size: 'M', range: '1Y', hover: null, imgView: 0,
    watch: DEMO_WATCH, modal: null, modalDone: false, bidAmt: '', exp: '30 days', modalBusy: false, modalResult: null, toast: null, w: typeof window !== 'undefined' ? window.innerWidth : 1280, showFilters: false, moreClubs: false, movers: 'up',
    sStep: 0, sShirt: null, sQuery: '', sScan: 'idle', sScanMsg: '', sScanMatch: null, sScanConf: 0, sImg: null, sSize: 'M', sCond: 'Very good', sEd: 'Replica', sPlayer: '', sAsk: '', sPub: false, sPubResult: null, sBusy: false, pTab: 'collection', pRange: '1Y',
    customItems: [], vaultItemId: null, publicData: shared,
    // Auth / account (Phase 6: real Supabase Auth, replaces the old anonymous,
    // single-device localStorage model).
    isAdmin: false, dataLoaded: false, notifOpen: false,
    authMode: 'signin', authEmail: '', authPassword: '', authError: '', authBusy: false, authNotice: '',
    // Display-only device preferences (not account data, so localStorage is
    // the right home for these — see utils/currency.js and utils/i18n.js).
    currency: loadJSON('kv_currency', 'CHF'), lang: loadJSON('kv_lang', 'en'),
    authReturn: null,
    ...routed
    // `orders` itself is NOT seeded here — it's loaded/polled lazily by
    // useOrders() only while the Profile "Orders" tab is actually open.
  };
}

export function useMaillot() {
  const [state, setRaw] = useState(initialState);
  const toastTimer = useRef(null);
  const sellScanToken = useRef(0);
  const { user, authLoading, signUp, signIn, signOut } = useAuth();
  const [reviewQueueNow, setReviewQueueNow] = useAdminQueue(state.isAdmin, state.view);
  const [apiKeysNow, setApiKeysNow] = useApiKeys(state.isAdmin, state.view);
  const [disputesNow, setDisputesNow] = useDisputes(state.isAdmin, state.view);
  // Plaintext of a just-created API key — held only in memory, shown once in
  // the admin UI, never persisted anywhere (only its hash lives in the DB).
  const [newApiKey, setNewApiKey] = useState(null);
  const [ordersNow, setOrdersNow] = useOrders(user ? user.id : null, state.view, state.pTab);
  const [notifsNow, setNotifsNow] = useNotifications(user ? user.id : null);
  const trendScores = useTrendingScores(state.view);
  const publicStats = usePublicStats(state.view === 'home');
  // Live order book for the shirt/size currently open on the detail page.
  const detailShirt = BY[state.id] || BY['ger-26'];
  const detailSize = resolveSize(detailShirt, state.size);
  const sellingShirt = state.view === 'sell' && state.sShirt ? BY[state.sShirt] : null;
  const shirtStats = useShirtStats(detailShirt.id, state.view === 'detail');
  const [book, reloadBook] = useOrderBook(
    sellingShirt ? sellingShirt.id : detailShirt.id,
    sellingShirt ? state.sSize : detailSize,
    state.view === 'detail' || !!sellingShirt
  );
  const personalEvents = usePersonalEvents(user ? user.id : null, state.view);
  // Live FX rates (see utils/currency.js) — fetched once per session and
  // reused by every price formatted below; starts from the cached/fallback
  // rates so prices render immediately, then refines once the fetch lands.
  const [fxRates, setFxRates] = useState(loadCachedRates);
  useEffect(() => {
    fetchLiveRates().then(setFxRates);
  }, []);

  const setState = (patch) => setRaw((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));
  // Shadows the raw CHF formatter: every price in the data layer (data.js,
  // orders/asks/bids) is stored in CHF, so converting + formatting at this
  // single point makes every chf(...) call site below — and v.money, exposed
  // for the two views that format prices directly — currency-aware for free.
  const chf = (n) => formatMoney(n, state.currency, fxRates);
  const t = (key) => translate(state.lang, key);
  const setCurrency = (code) => {
    saveJSON('kv_currency', code);
    setState({ currency: code });
  };
  const setLang = (lang) => {
    saveJSON('kv_lang', lang);
    setState({ lang });
  };

  useEffect(() => {
    const onR = () => setState({ w: window.innerWidth });
    window.addEventListener('resize', onR);
    onR();
    return () => {
      window.removeEventListener('resize', onR);
      clearTimeout(toastTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real per-account data load: once a Supabase session exists, pull this
  // user's custom items and watchlist from Postgres (notifications are
  // handled separately by useNotifications() below, which polls so the bell
  // stays live). On sign-out, fall back to the signed-out demo state (no
  // account = no persisted collection, same as any real marketplace).
  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setState({ customItems: [], watch: DEMO_WATCH, isAdmin: false, dataLoaded: !authLoading });
      return;
    }
    (async () => {
      try {
        const [profile, customItems, watch] = await Promise.all([
          supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle().then((r) => r.data),
          db.loadCustomItems(user.id),
          db.loadWatchlist(user.id)
        ]);
        if (cancelled) return;
        setState({ customItems, watch, isAdmin: !!(profile && profile.is_admin), dataLoaded: true });
      } catch {
        if (!cancelled) setState({ dataLoaded: true });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  // Real human-in-the-loop verification, part 2: once a saved Vault item's review request
  // has actually been approved/rejected by a human on the /admin screen, pull that decision
  // in here too — the AddShirt wizard that originally queued it may be long gone by then.
  // Backed by a genuine Postgres table now (polling it, same honest "no fake timer" contract
  // as before: nothing resolves unless a human actually acted on /admin).
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const sync = async () => {
      let queue;
      try {
        queue = await db.loadReviewQueue();
      } catch {
        return;
      }
      if (cancelled || !queue.length) return;
      setRaw((s) => {
        let changed = false;
        const next = s.customItems.map((c) => {
          const reviewId = c.verification && c.verification.reviewId;
          if (!reviewId || c.verification.status === 'verifiziert' || c.verification.status === 'abgelehnt') return c;
          const entry = queue.find((q) => q.id === reviewId);
          if (!entry) return c;
          if (entry.status === 'approved') {
            changed = true;
            const catalogItem = c.catalogId ? BY[c.catalogId] : null;
            const verification = { ...c.verification, level: 'expert', status: 'verifiziert', reason: '' };
            const valuation = estimateValue({ catalogItem, version: c.version, conditionGrade: c.condition.grade, flock: c.flock, patches: c.patches, signature: c.signature, verificationLevel: 'expert' });
            const updated = { ...c, verification, valuation, initialValuation: c.initialValuation || c.valuation, updatedAt: Date.now() };
            db.upsertCustomItem(user.id, updated).catch(() => {});
            return updated;
          }
          if (entry.status === 'rejected') {
            changed = true;
            const updated = { ...c, verification: { ...c.verification, status: 'abgelehnt', reason: entry.reason || 'Unstimmigkeiten konnten nicht ausgeräumt werden.' }, updatedAt: Date.now() };
            db.upsertCustomItem(user.id, updated).catch(() => {});
            return updated;
          }
          if (entry.status === 'in_review' && c.verification.status !== 'in Prüfung') {
            changed = true;
            return { ...c, verification: { ...c.verification, status: 'in Prüfung' } };
          }
          return c;
        });
        return changed ? { ...s, customItems: next } : s;
      });
    };
    sync();
    const interval = setInterval(sync, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // When a human admin actually opens the review queue, mark any brand-new ('pending')
  // requests as 'in_review' — a real signal that someone is now looking at them.
  useEffect(() => {
    if (state.view !== 'admin' || !state.isAdmin) return;
    (async () => {
      try {
        const queue = await db.loadReviewQueue();
        const pendingIds = queue.filter((q) => q.status === 'pending').map((q) => q.id);
        await Promise.all(pendingIds.map((id) => db.markInReview(id).catch(() => {})));
        if (pendingIds.length) setRaw((s) => ({ ...s }));
      } catch {
        /* best-effort */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.view, state.isAdmin]);

  // Stripe Checkout returns to /orders?checkout=success|cancel (see the
  // "checkout" edge function). Toast the outcome once and drop the query so
  // a reload doesn't repeat it. Legacy #order-success hashes still work.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const h = window.location.hash;
    const outcome = params.get('checkout') || (h.startsWith('#order-success') ? 'success' : h.startsWith('#order-cancel') ? 'cancel' : null);
    if (!outcome) return;
    window.history.replaceState(null, '', '/orders');
    setState({ view: 'profile', pTab: 'orders' });
    toast(outcome === 'success' ? 'Zahlung erfolgreich \u2014 Betrag wird bis zur Lieferbestätigung treuhänderisch verwahrt.' : 'Zahlung abgebrochen.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // URL <-> state. Every navigation that changes the page pushes a history
  // entry (so Back works); popstate restores the page from the URL.
  useEffect(() => {
    if (state.view === 'publicvault') return;
    const path = pathFor(state);
    // Leaving a (possibly broken) share link: drop its #/vault/… hash too,
    // otherwise a reload would land back on it.
    if (path && window.location.hash.startsWith('#/vault/')) window.history.replaceState(null, '', path);
    else if (path && path !== window.location.pathname) window.history.pushState(null, '', path);
    document.title = titleFor(state);
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', descriptionFor(state));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.view, state.id, state.pTab, state.vaultItemId]);
  useEffect(() => {
    const onPop = () => {
      if (parseShareHash(window.location.hash) !== undefined) return;
      setRaw((s) => ({ ...s, ...stateFromPath(window.location.pathname), modal: null, notifOpen: false }));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Deep link to a private page while signed out: send to sign-in and come
  // back to the requested page afterwards.
  useEffect(() => {
    if (authLoading || user || !PRIVATE_VIEWS.has(state.view)) return;
    setRaw((s) => ({ ...s, view: 'auth', authNotice: 'Bitte zuerst anmelden.', authReturn: { view: s.view, pTab: s.pTab, vaultItemId: s.vaultItemId } }));
  }, [authLoading, user, state.view]);

  const top = () => {
    try {
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch {
      window.scrollTo(0, 0);
    }
  };
  const go = (view, extra) => {
    setState({ view, modal: null, hover: null, ...(extra || {}) });
    top();
  };
  // "Sell yours" from a product page: skip identification, the shirt is known.
  const goSellShirt = (id, size) => go('sell', { sShirt: id, sSize: size, sStep: 1, sPub: false, sPubResult: null, sAsk: '' });
  const requireAuth = (view, extra) => {
    if (user) {
      go(view, extra);
      return true;
    }
    go('auth', { authNotice: 'Bitte zuerst anmelden.', authReturn: { view, ...(extra || {}) } });
    return false;
  };
  const open = (id) => {
    const s = BY[id];
    go('detail', { id, imgView: 0, range: '1Y', size: resolveSize(s, 'M') });
    db.logEvent(user ? user.id : null, id, 'view').catch(() => {});
  };
  const toast = (m) => {
    clearTimeout(toastTimer.current);
    setState({ toast: m });
    toastTimer.current = setTimeout(() => setState({ toast: null }), 2600);
  };
  const toggleWatch = (id) => {
    const wasOn = state.watch.includes(id);
    setRaw((s) => ({ ...s, watch: wasOn ? s.watch.filter((x) => x !== id) : [...s.watch, id] }));
    toast(wasOn ? 'Removed from watchlist' : 'Added to watchlist \u00b7 price alerts on');
    if (user) {
      (wasOn ? db.removeWatch(user.id, id) : db.addWatch(user.id, id)).catch(() => {});
      db.logEvent(user.id, id, wasOn ? 'unwatch' : 'watch').catch(() => {});
    }
  };
  // Notification bell (Header.jsx): backed by useNotifications() below, which
  // polls the real `notifications` table \u2014 rows land there the moment a bid
  // matches, an order changes status, or a dispute opens (see the Postgres
  // triggers in the "notifications_lifecycle_triggers" migration). Opening one
  // marks it read and, if it references an order, jumps to the Orders tab.
  const openNotification = (n) => {
    if (!n.read) {
      setNotifsNow((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      db.markNotificationRead(n.id).catch(() => {});
    }
    setState({ notifOpen: false });
    if (n.data && n.data.order_id) go('profile', { pTab: 'orders' });
  };

  const browseWith = (o) => go('browse', { q: o.q || '', filters: Object.assign({}, EMPTY, o.f || {}), minPrice: 0, maxPrice: o.max || 600 });
  const toggleF = (k, val) => {
    const f = Object.assign({}, state.filters);
    f[k] = f[k].includes(val) ? f[k].filter((x) => x !== val) : [...f[k], val];
    setState({ filters: f });
  };
  const VERIFY_BADGE = {
    self: { label: 'Selbst erfasst', color: '#C9D0CB', bg: 'rgba(255,255,255,0.08)', desc: 'Angaben stammen allein vom Einreicher \u2014 bisher ungeprüft.' },
    precheck: { label: 'Vorgeprüft', color: '#6FB6FF', bg: 'rgba(111,182,255,0.12)', desc: 'Automatischer Abgleich (Foto/Code) ohne Auffälligkeiten \u2014 kein Mensch hat es gesehen.' },
    expert: { label: 'Experten-verifiziert', color: '#E8B04B', bg: 'rgba(232,176,75,0.14)', desc: 'Ein Mensch hat die Einreichung geprüft und freigegeben.' }
  };
  const decoCustomCard = (c) => {
    const cat = c.catalogId ? BY[c.catalogId] : null;
    const rejected = c.verification.status === 'abgelehnt';
    const badge = rejected
      ? { label: 'Abgelehnt', color: '#FF6B5E', bg: 'rgba(255,107,94,0.14)', desc: 'Die Einreichung wurde bei der Prüfung abgelehnt.' }
      : VERIFY_BADGE[c.verification.level] || VERIFY_BADGE.self;
    const name = cat ? cat.name : [c.proposedClub, c.proposedSeason, c.proposedVariant].filter(Boolean).join(' ') || 'Unbenanntes Trikot';
    const days = Math.max(0, Math.floor((Date.now() - c.createdAt) / MS));
    const valuePresent = c.valuation && !c.valuation.blocked;
    return {
      id: c.id, name, pat: cat ? cat.pat : 'linear-gradient(180deg,#2A302D,#1A1F1C)', trim: cat ? cat.trim : '#8C958F', crest: cat ? cat.crest : '#8C958F',
      glowA: hexA(cat ? cat.glow : '#8C958F', 0.3), priceFmt: valuePresent ? chf(c.valuation.mid) : 'Ausstehend', paid: badge.label, gain: 'Neu', gainC: '#8C958F',
      size: c.size, when: 'Added ' + days + 'd ago', isCustom: true, badgeLabel: badge.label, badgeColor: badge.color, badgeBg: badge.bg, badgeDesc: badge.desc,
      rejected, rejectionReason: c.verification.reason || '',
      open: () => go('vaultitem', { vaultItemId: c.id })
    };
  };

  const addCustomItem = (item) => {
    if (!user) {
      go('auth', { authNotice: 'Bitte zuerst anmelden, um ein Trikot zu speichern.' });
      return;
    }
    const id = 'custom-' + Date.now();
    // Snapshot the self-reported valuation at submission time so the detail page can later
    // show a real before/after once an expert verification recalculates `valuation` (see the
    // review-queue sync effect above) — a genuine two-point value history, not a fabricated chart.
    const withId = { ...item, id, createdAt: Date.now(), updatedAt: Date.now(), initialValuation: item.valuation };
    setRaw((s) => ({ ...s, customItems: [...s.customItems, withId] }));
    db.upsertCustomItem(user.id, withId).catch(() => toast('Speichern fehlgeschlagen \u2014 bitte erneut versuchen.'));
    toast('Trikot gespeichert \u00b7 in deinem Vault');
    go('vaultitem', { vaultItemId: id, pTab: 'collection' });
  };

  // Re-queues a saved Vault item that was rejected, reusing its already-stored submission
  // fields (same shape AddShirt.jsx saved it with) — a real second review request, not a retry timer.
  const retryVerification = (id) => {
    if (!user) return;
    const c = state.customItems.find((x) => x.id === id);
    if (!c) return;
    db
      .enqueueReview(user.id, id, {
        catalogId: c.catalogId,
        proposedName: [c.proposedClub, c.proposedSeason, c.proposedVariant].filter(Boolean).join(' '),
        version: c.version,
        sizeGroup: c.sizeGroup,
        size: c.size,
        sleeve: c.sleeve,
        flock: c.flock,
        patches: c.patches,
        signature: c.signature,
        tagsAttached: c.tagsAttached,
        condition: c.condition,
        provenance: c.provenance,
        photos: c.photos,
        precheck: c.precheck
      })
      .then((reviewId) => {
        setRaw((s) => ({
          ...s,
          customItems: s.customItems.map((x) => {
            if (x.id !== id) return x;
            const updated = { ...x, verification: { ...x.verification, status: 'angefragt', reason: '', reviewId }, updatedAt: Date.now() };
            db.upsertCustomItem(user.id, updated).catch(() => {});
            return updated;
          })
        }));
        toast('Erneut zur Prüfung eingereicht');
      })
      .catch(() => toast('Einreichung fehlgeschlagen \u2014 bitte erneut versuchen.'));
  };

  // Escrow order book: decorate a raw `orders` row (see utils/db.js#loadMyOrders)
  // into display-ready fields plus a per-row list of actions, which depend on
  // both the viewer's role (buyer vs seller) and the order's current status.
  const decoOrder = (o) => {
    const isBuyer = user && o.buyer_id === user.id;
    const shirt = BY[o.shirt_id];
    const total = Number(o.amount) + Number(o.auth_fee || 0) + Number(o.shipping_fee || 0);
    const st = ORDER_STATUS[o.status] || { key: '', color: '#8C958F', bg: 'rgba(255,255,255,0.06)' };
    const actions = [];
    if (isBuyer && o.status === 'pending_payment') {
      actions.push({ label: t('order.action.payNow'), primary: true, run: () => payOrder(o.id) });
      actions.push({ label: t('order.action.cancel'), danger: true, run: () => cancelOrder(o.id) });
    }
    if (!isBuyer && o.status === 'paid_escrow') {
      actions.push({ label: t('order.action.markShipped'), primary: true, run: () => shipOrder(o.id) });
    }
    if (isBuyer && o.status === 'shipped') {
      actions.push({ label: t('order.action.confirmRelease'), primary: true, run: () => releaseOrder(o.id) });
    }
    if (o.status === 'paid_escrow' || o.status === 'shipped') {
      actions.push({ label: t('order.action.dispute'), run: () => disputeOrder(o.id) });
    }
    return {
      id: o.id, isBuyer, roleLabel: isBuyer ? t('order.role.buy') : t('order.role.sell'),
      name: shirt ? shirt.name : o.shirt_id, size: o.size, totalFmt: chf(total),
      statusLabel: st.key ? t(st.key) : o.status, statusColor: st.color, statusBg: st.bg,
      trackingCode: o.tracking_code || '', createdLabel: new Date(o.created_at).toLocaleDateString('de-CH', { day: 'numeric', month: 'short', year: 'numeric' }),
      actions
    };
  };

  // Starts a Stripe Checkout Session for a pending_payment order. If Stripe
  // hasn't been configured yet (no secret keys set on the Supabase project),
  // the edge function responds with { configured: false } and we just toast
  // instead of redirecting \u2014 the rest of the app keeps working either way.
  const payOrder = async (orderId) => {
    try {
      const res = await db.createCheckoutSession(orderId);
      if (!res.configured) {
        toast(res.message || t('toast.paymentsNotConfigured'));
        return;
      }
      window.location.href = res.url;
    } catch {
      toast(t('toast.paymentStartFailed'));
    }
  };
  // Every escrow transition is a server-side RPC that validates role +
  // current status (see db.js); the local patch just avoids waiting for the
  // next poll to reflect what the server already accepted.
  const patchOrder = (orderId, status) => setOrdersNow((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
  const shipOrder = async (orderId) => {
    const tracking = window.prompt(t('order.trackingPrompt'));
    if (tracking === null) return;
    try {
      await db.markOrderShipped(orderId, tracking);
      patchOrder(orderId, 'shipped');
      toast(t('toast.markedShipped'));
    } catch {
      toast(t('toast.actionFailed'));
    }
  };
  const releaseOrder = async (orderId) => {
    if (!window.confirm(t('order.confirmReleasePrompt'))) return;
    try {
      await db.confirmOrderReceipt(orderId);
      patchOrder(orderId, 'released');
      toast(t('toast.releaseConfirmed'));
    } catch {
      toast(t('toast.actionFailed'));
    }
  };
  const disputeOrder = async (orderId) => {
    if (!user) return;
    const reason = window.prompt(t('toast.disputePrompt'));
    if (!reason || !reason.trim()) return;
    try {
      await db.openDispute(orderId, reason.trim());
      patchOrder(orderId, 'disputed');
      toast(t('toast.disputeFiled'));
    } catch {
      toast(t('toast.disputeFailed'));
    }
  };
  const cancelOrder = async (orderId) => {
    try {
      await db.cancelOrder(orderId);
      patchOrder(orderId, 'cancelled');
      toast(t('toast.orderCancelled'));
    } catch {
      toast(t('toast.cancelFailed'));
    }
  };

  const deco = (s) => {
    const w = state.watch.includes(s.id),
      up = s.ch >= 0;
    return {
      id: s.id, club: s.club, name: s.name, season: s.season, brand: s.brand, league: s.league, cond: s.cond, pat: s.pat, trim: s.trim, crest: s.crest, num: s.num || s.trim, pName: s.pName, pNum: s.pNum,
      glowA: hexA(s.glow, 0.34), glowB: hexA(s.glow, 0.16), priceFmt: chf(s.price), chFmt: pct(s.ch), chColor: up ? ACC : NEG, chBg: up ? 'rgba(75,255,139,0.12)' : 'rgba(255,107,94,0.13)',
      tag: s.type === 'New' ? 'New season' : s.type, heartFill: w ? ACC : 'none', heartStroke: w ? ACC : '#F2F4F1', spark: s.spark, added: 'Added ' + s.added + 'd ago', player: s.player || '\u2014',
      open: () => open(s.id), toggleWatch: (e) => { e.stopPropagation(); toggleWatch(s.id); }
    };
  };

  const st = state;
  const mob = st.w < 760,
    view = st.view;
  const v = {};
  v.isLoggedIn = !!user;
  v.userId = user ? user.id : null;
  v.userEmail = user ? user.email : '';
  v.userInitials = user ? user.email.slice(0, 2).toUpperCase() : '';
  v.goAuth = () => go('auth', { authNotice: '' });
  v.doSignOut = () => {
    signOut();
    toast(t('toast.signedOut'));
    go('home');
  };
  v.notifications = notifsNow.map((n) => ({ id: n.id, title: n.title, body: n.body || '', read: n.read, timeAgo: timeAgo(n.created_at), open: () => openNotification(n) }));
  v.unreadCount = notifsNow.filter((n) => !n.read).length;
  v.hasUnread = v.unreadCount > 0;
  v.notifOpen = st.notifOpen;
  v.toggleNotif = () => setState({ notifOpen: !st.notifOpen });
  v.closeNotif = () => setState({ notifOpen: false });
  v.t = t;
  v.money = chf;
  v.currency = st.currency;
  v.setCurrency = setCurrency;
  v.currencyOptions = CURRENCIES;
  v.lang = st.lang;
  v.setLang = setLang;
  v.langOptions = LANGS;
  const navDefs = [
    ['home', t('nav.discover'), t('nav.discover')],
    ['browse', t('nav.marketplace'), t('nav.marketShort')],
    ['sell', t('nav.sell'), t('nav.sell')],
    ['profile', t('nav.collection'), t('nav.collectionShort')]
  ];
  if (st.isAdmin) navDefs.push(['admin', t('nav.admin'), t('nav.admin')]);
  v.verifyTiers = Object.entries(VERIFY_BADGE).map(([level, b]) => ({ level, ...b }));
  v.isMobile = mob;
  v.notMobile = !mob;
  v.showNavSearch = st.w >= 1100;
  v.padBottom = mob ? '76px' : '0px';
  v.q = st.q;
  v.watchCount = String(st.watch.length);
  v.isHome = view === 'home';
  v.isBrowse = view === 'browse';
  v.isDetail = view === 'detail';
  v.isSell = view === 'sell';
  v.isProfile = view === 'profile';
  v.isAdd = view === 'addshirt';
  v.isVaultItem = view === 'vaultitem';
  v.isAdmin = view === 'admin';
  v.isPublicVault = view === 'publicvault';
  v.isAuth = view === 'auth';
  v.navItems = navDefs.map(([k, l, sh]) => {
    const on = view === k || (k === 'browse' && view === 'detail');
    return { label: l, short: sh, color: on ? '#F2F4F1' : '#8C958F', bg: on ? 'rgba(255,255,255,0.07)' : 'transparent', dot: on ? ACC : 'transparent', go: () => go(k) };
  });
  v.goHome = () => go('home');
  v.goBrowse = () => browseWith({});
  v.goSell = () => go('sell');
  v.goProfile = () => requireAuth('profile', { pTab: 'collection' });
  v.goWatch = () => requireAuth('profile', { pTab: 'watchlist' });
  v.goAddShirt = () => requireAuth('addshirt');
  v.cancelAddShirt = () => go('profile', { pTab: 'collection' });
  v.goAdmin = () => go('admin');
  v.addCustomItem = addCustomItem;
  v.onNavSearch = (e) => setState({ q: e.target.value, view: 'browse' });
  v.stop = (e) => e.stopPropagation();
  v.hasToast = !!st.toast;
  v.toast = st.toast || '';
  v.toastBottom = mob ? '92px' : '32px';

  // AUTH — real Supabase email/password sign-up & sign-in.
  v.auth = {
    mode: st.authMode,
    isSignIn: st.authMode === 'signin',
    email: st.authEmail,
    password: st.authPassword,
    error: st.authError,
    notice: st.authNotice,
    busy: st.authBusy,
    onEmail: (e) => setState({ authEmail: e.target.value }),
    onPassword: (e) => setState({ authPassword: e.target.value }),
    switchMode: () => setState({ authMode: st.authMode === 'signin' ? 'signup' : 'signin', authError: '' }),
    submit: async () => {
      if (!st.authEmail || !st.authPassword) {
        setState({ authError: t('auth.required') });
        return;
      }
      setState({ authBusy: true, authError: '' });
      const fn = st.authMode === 'signin' ? signIn : signUp;
      const { error } = await fn(st.authEmail, st.authPassword);
      if (error) {
        setState({ authBusy: false, authError: error });
        return;
      }
      setState({ authBusy: false, authPassword: '' });
      if (st.authMode === 'signup') {
        toast(t('toast.accountCreated'));
        setState({ authMode: 'signin' });
      } else {
        toast(t('toast.signedIn'));
        const back = st.authReturn;
        if (back && back.view) go(back.view, { ...back, authReturn: null });
        else go('profile', { pTab: 'collection' });
      }
    }
  };

  // HOME
  // Behaviour-based trending: blend each shirt's real events-table signal
  // (from trending_scores(), aggregating actual views/watches/bids/buys
  // across every user server-side — see useTrendingScores() below) with its
  // synthetic 30-day price trend. The synthetic trend alone keeps the list
  // sensible on a cold start with no events yet; as real usage accumulates,
  // the live signal increasingly dominates the ranking.
  const maxTrendScore = Math.max(1, ...Object.values(trendScores));
  const liveTrend = (s) => s.trend + ((trendScores[s.id] || 0) / maxTrendScore) * 40;
  const T = [...SHIRTS].sort((a, b) => liveTrend(b) - liveTrend(a)).slice(0, 8).map((s) => s.id);
  v.trending = T.map((id) => deco(BY[id]));

  // Personalised "Recommended for you": derived from this user's own recent
  // events (view/watch/bid/buy, see usePersonalEvents() below — RLS already
  // restricts that read to their own rows). Each club in the catalogue only
  // has a single shirt, so a strict "same club" match would almost never
  // surface anything — instead this scores by league/type affinity, the same
  // similarity signal already used for v.related below, weighted by how much
  // the user engaged with shirts sharing that league/type. The shirts that
  // actually generated the events are excluded (recommending the exact thing
  // they already viewed/bid on isn't useful), along with anything owned.
  // Hidden entirely once there's no personal history yet, rather than
  // showing an empty/cold-start section.
  const ownedIds = new Set(st.customItems.map((c) => c.catalogId).filter(Boolean));
  const seenIds = new Set();
  const leagueWeight = {};
  const typeWeight = {};
  personalEvents.forEach((e) => {
    const shirt = BY[e.shirt_id];
    if (!shirt) return;
    seenIds.add(shirt.id);
    const w = { buy: 8, bid: 5, watch: 3, view: 1, unwatch: 0 }[e.type] || 0;
    leagueWeight[shirt.league] = (leagueWeight[shirt.league] || 0) + w;
    typeWeight[shirt.type] = (typeWeight[shirt.type] || 0) + w;
  });
  const affinityScore = (s) => (leagueWeight[s.league] || 0) + (typeWeight[s.type] || 0);
  const recommended = Object.keys(leagueWeight).length || Object.keys(typeWeight).length
    ? [...SHIRTS]
        .filter((s) => affinityScore(s) > 0 && !ownedIds.has(s.id) && !seenIds.has(s.id))
        .sort((a, b) => affinityScore(b) - affinityScore(a) || b.trend - a.trend)
        .slice(0, 8)
    : [];
  v.recommended = recommended.map((s) => deco(s));
  v.showRecommended = v.recommended.length > 0;
  const sortedCh = [...SHIRTS].sort((a, b) => b.ch - a.ch);
  const mv = st.movers === 'up' ? sortedCh.slice(0, 6) : sortedCh.slice(-6).reverse();
  v.movers = mv.map((s, i) => Object.assign(deco(s), { rank: String(i + 1).padStart(2, '0') }));
  v.moverTabs = [['up', 'Gainers'], ['down', 'Losers']].map(([k, l]) => ({ label: l, bg: st.movers === k ? '#F2F4F1' : 'transparent', color: st.movers === k ? '#0A0C0B' : '#C9D0CB', pick: () => setState({ movers: k }) }));
  v.newest = [...SHIRTS].sort((a, b) => a.added - b.added).slice(0, 8).map((s) => deco(s));
  v.feat = deco(BY['ger-26']);
  v.heroQ = st.heroQ;
  v.onHeroQ = (e) => setState({ heroQ: e.target.value });
  v.onHeroKey = (e) => { if (e.key === 'Enter') go('browse', { q: st.heroQ, filters: EMPTY }); };
  v.heroGo = () => go('browse', { q: st.heroQ, filters: EMPTY });
  const hq = st.heroQ.trim().toLowerCase();
  const sug = hq ? SHIRTS.filter((s) => hq.split(/\s+/).every((w) => s.hay.includes(w))).slice(0, 5) : [];
  v.showSug = sug.length > 0;
  v.sug = sug.map((s) => deco(s));
  v.noSug = !!hq && !sug.length;
  v.quick = [
    { label: 'Retro classics', f: { type: ['Retro'] } },
    { label: 'Match-worn', f: { type: ['Match-worn'] } },
    { label: 'World Cup 2026', q: '2026', f: { league: ['National Teams'] } },
    { label: 'Swiss Super League', f: { league: ['Swiss Super League'] } },
    { label: 'Under CHF 120', max: 120 }
  ].map((o) => ({ label: o.label, go: () => browseWith(o) }));
  // Market index ticker: computed from the catalogue (the same index data the
  // product pages chart), never typed in by hand.
  const segment = (label, pred) => {
    const xs = SHIRTS.filter(pred);
    if (!xs.length) return null;
    const avg = xs.reduce((a, x) => a + x.price, 0) / xs.length;
    const ch = xs.reduce((a, x) => a + x.ch, 0) / xs.length;
    return { label, val: Math.round(avg).toLocaleString('de-CH'), ch: pct(ch), color: ch >= 0 ? ACC : NEG };
  };
  v.indices = [
    segment('All shirts', () => true),
    segment('Retro', (x) => x.type === 'Retro'),
    segment('Match-worn', (x) => x.type === 'Match-worn'),
    segment('World Cup \u201926', (x) => x.league === 'National Teams' && x.year === 2026),
    segment('Swiss SL', (x) => x.league === 'Swiss Super League'),
    segment('Premier League', (x) => x.league === 'Premier League'),
    segment('Serie A', (x) => x.league === 'Serie A')
  ].filter(Boolean);
  v.heroBadge = 'Live price index \u00b7 ' + SHIRTS.length + ' shirts catalogued';
  // Hero stats: a real number is only shown once it's meaningful; until then
  // the slots carry concrete promises instead of invented traction.
  const ps = publicStats;
  const compactChf = (n) => (n >= 1e6 ? 'CHF ' + (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? 'CHF ' + Math.round(n / 1e3) + 'k' : chf(n));
  const realStats = ps
    ? [
        Number(ps.traded_chf) >= 50000 && { value: compactChf(Number(ps.traded_chf)), label: 'traded on Maillot' },
        Number(ps.collectors) >= 1000 && { value: Number(ps.collectors).toLocaleString('de-CH'), label: 'collectors' },
        Number(ps.live_listings) >= 100 && { value: Number(ps.live_listings).toLocaleString('de-CH'), label: 'live listings' }
      ].filter(Boolean)
    : [];
  const promises = [
    { value: 'Escrow', label: 'on every order' },
    { value: '14-point', label: 'authentication in Z\u00fcrich' },
    { value: 'TWINT', label: '& card payments' }
  ];
  v.heroStats = [...realStats, ...promises].slice(0, 3);

  // BROWSE
  const f = st.filters,
    words = st.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const keyOf = { type: 'type', league: 'league', brand: 'brand', decade: 'decade', condition: 'cond', club: 'club' };
  let list = SHIRTS.filter((s) => words.every((w) => s.hay.includes(w)) && Object.keys(keyOf).every((k) => !f[k].length || f[k].includes(s[keyOf[k]])) && s.price >= st.minPrice && s.price <= st.maxPrice);
  const sorts = { trending: (a, b) => b.trend - a.trend, newest: (a, b) => a.added - b.added, asc: (a, b) => a.price - b.price, desc: (a, b) => b.price - a.price, gain: (a, b) => b.ch - a.ch };
  list.sort(sorts[st.sort]);
  v.results = list.map((s) => deco(s));
  v.noResults = !list.length;
  v.resultLabel = list.length + ' of ' + SHIRTS.length + ' shirts \u00b7 prices = market value';
  v.sort = st.sort;
  v.onSort = (e) => setState({ sort: e.target.value });
  const groups = [['type', 'Category', ['New', 'Retro', 'Match-worn']], ['league', 'League', uniq('league')], ['club', 'Club', uniq('club').sort()], ['brand', 'Brand', uniq('brand').sort()], ['decade', 'Era', uniq('decade').sort().reverse()], ['condition', 'Condition', CONDS]];
  v.filterGroups = groups.map(([k, t, opts]) => {
    const isClub = k === 'club';
    const shown = isClub && !st.moreClubs ? opts.slice(0, 6) : opts;
    return {
      title: t, hasMore: isClub, moreLabel: st.moreClubs ? 'Show fewer' : 'Show all ' + opts.length + ' clubs', toggleMore: () => setState({ moreClubs: !st.moreClubs }),
      options: shown.map((o) => {
        const on = f[k].includes(o);
        return { label: o, count: String(SHIRTS.filter((s) => s[keyOf[k]] === o).length), color: on ? '#F2F4F1' : '#C9D0CB', box: on ? ACC : 'rgba(255,255,255,0.22)', fill: on ? ACC : 'transparent', tick: on ? 1 : 0, toggle: () => toggleF(k, o) };
      })
    };
  });
  v.minPrice = String(st.minPrice);
  v.maxPrice = String(st.maxPrice);
  v.priceLabel = chf(st.minPrice) + ' \u2013 ' + chf(st.maxPrice) + (st.maxPrice >= 600 ? '+' : '');
  v.onMin = (e) => setState({ minPrice: Math.min(+e.target.value, st.maxPrice - 10) });
  v.onMax = (e) => setState({ maxPrice: Math.max(+e.target.value, st.minPrice + 10) });
  const chips = [];
  if (st.q) chips.push({ label: '\u201c' + st.q + '\u201d', rm: () => setState({ q: '' }) });
  Object.keys(f).forEach((k) => f[k].forEach((o) => chips.push({ label: o, rm: () => toggleF(k, o) })));
  if (st.minPrice > 0 || st.maxPrice < 600) chips.push({ label: v.priceLabel, rm: () => setState({ minPrice: 0, maxPrice: 600 }) });
  v.chips = chips;
  v.hasChips = chips.length > 0;
  v.clearAll = () => setState({ q: '', filters: EMPTY, minPrice: 0, maxPrice: 600 });
  v.showAside = !mob || st.showFilters;
  v.browseDir = mob ? 'column' : 'row';
  v.asideFlex = mob ? '1 1 auto' : '0 0 248px';
  v.asidePos = mob ? 'static' : 'sticky';
  v.toggleFilters = () => setState({ showFilters: !st.showFilters });
  v.filterBtnLabel = (st.showFilters ? 'Hide filters' : 'Filters') + (chips.length ? ' (' + chips.length + ')' : '');

  // DETAIL
  // Two kinds of numbers live on this page and are kept visibly apart:
  //  * index data (market value, chart, recent sales) — catalogue estimates
  //  * the live order book (lowest ask / highest bid) — real rows in
  //    asks/bids. "Buy now" only exists when a real seller is listed.
  const s = detailShirt;
  const d = deco(s);
  v.d = d;
  const size = detailSize;
  const askOf = (z) => Math.round(s.price * (s.type === 'Match-worn' ? 1 : MULT[z]));
  const ask = askOf(size),
    bid = Math.round(ask * 0.88),
    last = Math.round(s.sales[0].p * (s.type === 'Match-worn' ? 1 : MULT[size]));
  const liveAsk = book.asks.find((a) => !user || a.user_id !== user.id) || null;
  const liveBid = book.bids[0] || null;
  const myAsk = user ? book.asks.find((a) => a.user_id === user.id) : null;
  v.hasLiveAsk = !!liveAsk;
  v.noLiveAsk = !liveAsk;
  v.liveAskFmt = liveAsk ? chf(Number(liveAsk.amount)) : '—';
  v.liveBidFmt = liveBid ? chf(Number(liveBid.amount)) : '—';
  v.liveAskSub = liveAsk ? book.asks.length + (book.asks.length === 1 ? ' listing' : ' listings') : 'No sellers yet';
  v.liveBidSub = liveBid ? book.bids.length + (book.bids.length === 1 ? ' bid' : ' bids') : 'No bids yet';
  v.myAskFmt = myAsk ? chf(Number(myAsk.amount)) : '';
  v.hasMyAsk = !!myAsk;
  v.marketFmt = chf(ask);
  v.sellThis = () => goSellShirt(s.id, size);
  v.sizeSel = size;
  v.isOneSize = s.type === 'Match-worn';
  v.multiSize = !v.isOneSize;
  v.sizeOpts = s.sizes.map((z) => {
    const on = z === size;
    return { label: z, price: chf(askOf(z)), bg: on ? 'rgba(75,255,139,0.1)' : '#121514', border: on ? ACC : 'rgba(255,255,255,0.08)', op: 1, cur: 'pointer', pick: () => setState({ size: z }) };
  });
  v.askFmt = chf(ask);
  v.bidFmtTop = chf(bid);
  v.lastFmt = chf(last);
  v.lastDelta = pct(((ask - last) / last) * 100) + ' vs ask';
  v.watched = st.watch.includes(s.id);
  v.watchLabel = v.watched ? 'Watching' : 'Watch';
  v.watchToggle = () => toggleWatch(s.id);
  // Real community numbers (watchlists + open listings across all sizes).
  const ss = shirtStats && shirtStats.id === s.id ? shirtStats.stats : null;
  const watchers = ss ? Number(ss.watchers) : 0;
  v.watchersLabel = watchers ? watchers.toLocaleString('de-CH') + ' watching' : 'Be the first to watch';
  v.listingsLabel = ss && Number(ss.live_listings) ? Number(ss.live_listings) + ' listed' : 'No listings yet';
  v.watchersN = watchers.toLocaleString('de-CH');
  v.listingsN = ss ? String(Number(ss.live_listings)) : '0';
  v.isUnique = s.type === 'Match-worn';
  const days = RANGES[st.range],
    slice = s.hist.slice(-Math.min(days, s.L)),
    off = s.L - slice.length;
  const ds = down(slice, 140),
    lp = linePath(ds, 1000, 280, 24);
  const up = slice[slice.length - 1] >= slice[0];
  v.chartColor = up ? ACC : NEG;
  v.lineD = lp.d;
  v.areaD = lp.area;
  v.rangeChange = pct(((slice[slice.length - 1] - slice[0]) / slice[0]) * 100);
  v.rangeColor = v.chartColor;
  v.yTop = chf(lp.mx);
  v.yMid = chf((lp.mx + lp.mn) / 2);
  v.yBot = chf(lp.mn);
  const fd = (i) => new Date(TODAY - (s.L - 1 - i) * MS).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
  v.xLabels = [0, 0.25, 0.5, 0.75, 1].map((t) => ({ l: fd(off + Math.round(t * (slice.length - 1))) }));
  v.ranges = Object.keys(RANGES).map((k) => ({ label: k, bg: st.range === k ? '#F2F4F1' : 'transparent', color: st.range === k ? '#0A0C0B' : '#C9D0CB', pick: () => setState({ range: k, hover: null }) }));
  if (st.hover != null) {
    const p = lp.pts[Math.round(st.hover * (lp.pts.length - 1))];
    v.hoverOn = true;
    v.hoverLeft = p.x / 10 + '%';
    v.hoverTop = (p.y / 280) * 100 + '%';
    v.hoverPrice = chf(p.v);
    v.hoverDate = fd(off + p.i);
    v.tipX = st.hover < 0.15 ? '0%' : st.hover > 0.85 ? '-100%' : '-50%';
    v.headPrice = chf(p.v);
    v.headSub = fd(off + p.i);
  } else {
    v.hoverOn = false;
    v.hoverLeft = '0%';
    v.hoverTop = '0%';
    v.hoverPrice = '';
    v.hoverDate = '';
    v.tipX = '-50%';
    v.headPrice = chf(s.price);
    v.headSub = 'Market price today';
  }
  v.onChartMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect(),
      x = e.touches ? e.touches[0].clientX : e.clientX;
    setState({ hover: Math.max(0, Math.min(1, (x - r.left) / r.width)) });
  };
  v.onChartLeave = () => setState({ hover: null });
  v.thumbs = ['Front', 'Back', 'Crest', 'Wash tag'].map((l, i) => ({ label: l, border: st.imgView === i ? ACC : 'rgba(255,255,255,0.08)', pick: () => setState({ imgView: i }) }));
  v.imgFront = st.imgView === 0;
  v.imgBack = st.imgView === 1;
  v.imgCrest = st.imgView === 2;
  v.imgTag = st.imgView === 3;
  v.hasNum = !!s.pNum;
  const y = s.hist.slice(-365);
  v.details = [['Season', s.season], ['Brand', s.brand], ['League', s.league], ['Edition', s.edition], ['Player print', s.player || 'None'], ['Condition', s.cond], ['Catalogue no.', s.sku]].map(([k, val]) => ({ k, v: val }));
  v.market = [
    ['52-week high', chf(Math.max(...y))],
    ['52-week low', chf(Math.min(...y))],
    ['Avg. sale (30d)', chf(s.hist.slice(-30).reduce((a, b) => a + b, 0) / 30)],
    ['Volatility', (Math.abs(s.ch) / 3 + 2.1).toFixed(1) + '%'],
    ['Completed sales on Maillot', ss ? Number(ss.completed_sales).toLocaleString('de-CH') : '\u2014'],
    ['Price premium vs retail', s.type === 'New' ? pct(s.ch * 0.8) : 'Retro \u00b7 n/a']
  ].map(([k, val]) => ({ k, v: val }));
  v.sales = s.sales.map((x) => ({ date: new Date(TODAY - x.o * MS).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), size: x.size, price: chf(x.p * (s.type === 'Match-worn' ? 1 : MULT[x.size] || 1)), cond: s.cond }));
  v.related = SHIRTS.filter((x) => x.id !== s.id && (x.league === s.league || x.type === s.type)).sort((a, b) => b.trend - a.trend).slice(0, 4).map((x) => deco(x));
  v.openBuy = () => liveAsk && setState({ modal: 'buy', modalDone: false, modalResult: null });
  v.openBid = () => setState({ modal: 'bid', modalDone: false, modalResult: null, bidAmt: String(liveBid ? Number(liveBid.amount) + 5 : bid) });
  v.toBrowse = () => browseWith({});
  v.toLeague = () => browseWith({ f: { league: [s.league] } });

  // MODAL
  v.modalOpen = !!st.modal;
  v.modalDone = st.modalDone;
  v.modalNotDone = !st.modalDone;
  v.isBuy = st.modal === 'buy';
  v.isBid = st.modal === 'bid';
  v.modalTitle = st.modal === 'buy' ? 'Buy now' : 'Place a bid';
  v.modalAlign = mob ? 'flex-end' : 'center';
  v.modalPad = mob ? '0' : '24px';
  v.modalRadius = mob ? '24px 24px 0 0' : '24px';
  v.closeModal = () => setState({ modal: null, modalDone: false, modalResult: null });
  const buyPrice = liveAsk ? Number(liveAsk.amount) : ask;
  const bf = buyerCheckoutFees(buyPrice);
  v.buyRows = [{ k: 'Lowest ask · size ' + size, v: chf(buyPrice) }, { k: 'Authentication (Zürich)', v: chf(bf.authFee) }, { k: 'Insured shipping', v: chf(bf.shipping) }];
  v.buyTotal = chf(bf.total);
  const ba = parseInt(st.bidAmt, 10) || 0;
  const topBid = liveBid ? Number(liveBid.amount) : 0;
  v.bidAmt = st.bidAmt;
  v.onBidAmt = (e) => setState({ bidAmt: e.target.value.replace(/[^0-9]/g, '') });
  v.bidFmt = chf(ba);
  v.bidQuick = [
    topBid ? ['Beat highest bid', topBid + 1] : ['Market value', ask],
    ['Strong bid', Math.round(((topBid || bid) + buyPrice) / 2)],
    liveAsk ? ['Buy at lowest ask', buyPrice] : ['Opening bid', bid]
  ].map(([k, n]) => ({ k, v: chf(n), pick: () => setState({ bidAmt: String(n) }) }));
  v.expOpts = ['7 days', '14 days', '30 days', '60 days'].map((x) => ({ label: x, bg: st.exp === x ? 'rgba(75,255,139,0.08)' : '#161A18', border: st.exp === x ? ACC : 'rgba(255,255,255,0.08)', pick: () => setState({ exp: x }) }));
  v.bidHint = liveAsk && ba >= buyPrice
    ? 'Your bid meets the lowest ask — it will execute instantly at ' + chf(buyPrice) + '.'
    : ba > topBid
      ? (topBid ? 'You’ll be the highest bidder.' : 'You’ll be the first bidder in this size.') + ' Sellers see your bid immediately.'
      : 'Below the current highest bid (' + chf(topBid) + ').';
  v.bidHintColor = ba > topBid ? ACC : '#E8B04B';
  v.modalBusy = !!st.modalBusy;
  // Buy and Bid both go through the real order book: a buy is simply a bid
  // at the lowest ask, so the server-side matcher (which forbids self-trades
  // and locks both rows) decides what actually happened. The confirmation
  // screen reports that outcome — never an optimistic "order confirmed".
  v.confirmModal = async () => {
    const amount = st.modal === 'buy' ? buyPrice : ba;
    if (!amount || st.modalBusy) return;
    if (!user) {
      setState({ modal: null });
      go('auth', { authNotice: 'Bitte zuerst anmelden, um zu kaufen oder zu bieten.' });
      return;
    }
    setState({ modalBusy: true });
    try {
      const days = parseInt(st.exp, 10) || 30;
      const placed = await db.placeBid(user.id, s.id, size, amount, new Date(Date.now() + days * MS).toISOString());
      db.logEvent(user.id, s.id, st.modal === 'buy' ? 'buy' : 'bid').catch(() => {});
      const order = await db.findOrderForBid(placed.id);
      setState({ modalBusy: false, modalDone: true, modalResult: order ? { kind: 'matched', orderId: order.id, amount: Number(order.amount) } : { kind: 'live', amount } });
      reloadBook();
    } catch {
      setState({ modalBusy: false });
      toast(t('toast.actionFailed'));
    }
  };
  const mr = st.modalResult;
  v.doneMatched = !!mr && mr.kind === 'matched';
  v.doneTitle = v.doneMatched ? 'It’s a match' : 'Bid placed';
  v.doneText = v.doneMatched
    ? 'A seller accepted at ' + chf(mr.amount) + '. Pay now to lock it in — your money is held in escrow until the shirt has passed authentication and you confirm delivery.'
    : mr
      ? 'Your bid of ' + chf(mr.amount) + ' for ' + s.name + ' (size ' + size + ') is live for ' + st.exp + '. If a seller meets it, we’ll notify you to complete payment.'
      : '';
  v.donePay = () => {
    if (!mr || !mr.orderId) return;
    setState({ modal: null, modalDone: false, modalResult: null });
    payOrder(mr.orderId);
  };

  // SELL
  // 1 Identify (catalogue search, or a real OCR read of the label photo)
  // 2 Details  3 Price (live order book + index value)  4 Review → real ask.
  const sellShirt = st.sShirt ? BY[st.sShirt] : null;
  const sellDeco = sellShirt ? deco(sellShirt) : null;
  v.sShirt = sellDeco;
  v.hasSellShirt = !!sellShirt;
  v.sellSteps = ['Identify', 'Details', 'Price', 'Review'].map((l, i) => ({ n: String(i + 1), label: l, bg: i < st.sStep ? ACC : i === st.sStep ? '#F2F4F1' : '#1A1F1C', color: i <= st.sStep ? '#0A0C0B' : '#8C958F', lc: i <= st.sStep ? '#F2F4F1' : '#8C958F', bar: i < st.sStep ? ACC : 'rgba(255,255,255,0.1)', notLast: i < 3 }));
  v.s0 = st.sStep === 0 && !st.sPub;
  v.s1 = st.sStep === 1 && !st.sPub && !!sellShirt;
  v.s2 = st.sStep === 2 && !st.sPub && !!sellShirt;
  v.s3 = st.sStep === 3 && !st.sPub && !!sellShirt;
  v.sPub = st.sPub;
  v.sFlow = !st.sPub;
  const pickSellShirt = (id) => {
    const sh = BY[id];
    setState({ sShirt: id, sSize: sh.sizes.includes(st.sSize) ? st.sSize : sh.sizes[0], sStep: 1, sAsk: '' });
    top();
  };
  v.sQuery = st.sQuery;
  v.onSellQuery = (e) => setState({ sQuery: e.target.value });
  const sq = st.sQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const sellHits = sq.length ? SHIRTS.filter((x) => sq.every((w) => x.hay.includes(w))).slice(0, 8) : [];
  v.sellResults = sellHits.map((x) => ({ ...deco(x), pick: () => pickSellShirt(x.id) }));
  v.sellNoResults = sq.length > 0 && !sellHits.length;
  v.sellPopular = [...SHIRTS].sort((a, b) => b.trend - a.trend).slice(0, 6).map((x) => ({ ...deco(x), pick: () => pickSellShirt(x.id) }));
  v.showSellPopular = !sq.length && st.sScan !== 'done';
  // Real label scan: Tesseract OCR in the browser + catalogue word-overlap match.
  v.sScanBusy = st.sScan === 'reading';
  v.sScanMsg = st.sScanMsg;
  v.sImgBg = st.sImg ? 'url("' + st.sImg + '")' : 'none';
  v.hasSellImg = !!st.sImg;
  const scanMatch = st.sScanMatch ? BY[st.sScanMatch] : null;
  v.sScanMatch = scanMatch ? { ...deco(scanMatch), pick: () => pickSellShirt(scanMatch.id), confidence: Math.round(st.sScanConf * 100) + '%' } : null;
  v.onSellFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const token = ++sellScanToken.current;
    setState({ sScan: 'reading', sScanMsg: 'Reading the label…', sScanMatch: null, sImg: null });
    try {
      const photo = await analyzeAndCompress(file, { maxDim: 1400 });
      if (sellScanToken.current !== token) return;
      setState({ sImg: photo.dataUrl });
      const text = await readLabelText(photo.dataUrl);
      if (sellScanToken.current !== token) return;
      const { item, confidence } = matchCatalogFromOcrText(text);
      if (item && confidence >= 0.34) {
        setState({ sScan: 'done', sScanMatch: item.id, sScanConf: confidence, sScanMsg: '', sQuery: item.name });
      } else {
        setState({ sScan: 'done', sScanMatch: null, sScanMsg: text ? 'We couldn’t match that label confidently — search for the shirt instead.' : 'No readable text on that photo — try the inner wash/product label, or search below.' });
      }
    } catch {
      if (sellScanToken.current === token) setState({ sScan: 'idle', sScanMsg: 'Scanning failed — please search for the shirt instead.' });
    }
  };
  v.sChange = () => { setState({ sStep: 0 }); top(); };
  v.sNext = () => { if (!v.nextDisabled) { setState({ sStep: Math.min(3, st.sStep + 1) }); top(); } };
  v.sBack = () => { setState({ sStep: Math.max(0, st.sStep - 1) }); top(); };
  v.canBack = st.sStep > 0;
  const sa = parseInt(st.sAsk, 10) || 0;
  v.nextLabel = st.sStep === 2 ? 'Review listing' : 'Continue';
  v.showNext = st.sStep > 0 && st.sStep < 3 && !!sellShirt;
  v.nextDisabled = st.sStep === 2 && sa <= 0;
  const sellSizes = sellShirt ? sellShirt.sizes : SIZES;
  v.sSizes = sellSizes.map((z) => ({ label: z, bg: st.sSize === z ? 'rgba(75,255,139,0.1)' : '#121514', border: st.sSize === z ? ACC : 'rgba(255,255,255,0.08)', pick: () => setState({ sSize: z }) }));
  v.sConds = [['New with tags', 'Never worn, original tags attached'], ['Excellent', 'Worn lightly, no visible flaws'], ['Very good', 'Minor signs of wear, print intact'], ['Good', 'Visible wear, fading or small marks']].map(([l, dsc]) => ({ label: l, desc: dsc, bg: st.sCond === l ? 'rgba(75,255,139,0.07)' : '#121514', border: st.sCond === l ? ACC : 'rgba(255,255,255,0.08)', pick: () => setState({ sCond: l }) }));
  v.sEds = ['Replica', 'Authentic', 'Player issue', 'Match-worn'].map((x) => ({ label: x, bg: st.sEd === x ? '#F2F4F1' : 'transparent', color: st.sEd === x ? '#0A0C0B' : '#C9D0CB', pick: () => setState({ sEd: x }) }));
  v.sPlayer = st.sPlayer;
  v.onPlayer = (e) => setState({ sPlayer: e.target.value.slice(0, 60) });
  v.sAsk = st.sAsk;
  v.onAsk = (e) => setState({ sAsk: e.target.value.replace(/[^0-9]/g, '').slice(0, 6) });
  // Price guidance: the live book for this shirt/size, plus the index value.
  const sellMarket = sellShirt ? Math.round(sellShirt.price * (sellShirt.type === 'Match-worn' ? 1 : MULT[st.sSize] || 1)) : 0;
  const sellLowAsk = sellShirt && book.asks.length ? Number(book.asks[0].amount) : null;
  const sellTopBid = sellShirt && book.bids.length ? Number(book.bids[0].amount) : null;
  const marks = [['Market value', sellMarket, '#E8B04B']];
  if (sellTopBid) marks.push(['Highest bid', sellTopBid, '#C9D0CB']);
  if (sellLowAsk) marks.push(['Lowest ask', sellLowAsk, ACC]);
  const markVals = marks.map((m) => m[1]).concat(sa > 0 ? [sa] : []);
  const lo = Math.min(...markVals) * 0.85,
    hi = Math.max(...markVals) * 1.15 || 1;
  const posOf = (n) => Math.max(0, Math.min(100, ((n - lo) / (hi - lo || 1)) * 100)) + '%';
  v.mkMarks = marks.map(([l, n, c]) => ({ l, v: chf(n), left: posOf(n), c }));
  v.yourLeft = posOf(sa);
  v.askFmtS = chf(sa);
  v.sellSizeLabel = st.sSize;
  v.sQuick = [
    sellTopBid ? ['Sell now to top bid', sellTopBid] : null,
    sellLowAsk ? ['Undercut lowest ask', Math.max(1, sellLowAsk - 1)] : null,
    ['Market value', sellMarket]
  ]
    .filter(Boolean)
    .map(([l, n]) => ({ label: l, v: chf(n), pick: () => setState({ sAsk: String(n) }) }));
  const sp = sellerPayout(sa);
  v.payRows = [{ k: 'Your ask', v: chf(sa) }, { k: 'Seller fee (8%)', v: '−' + chf(sp.commission) }, { k: 'Authentication', v: 'Free' }, { k: 'Shipping to vault', v: 'Prepaid label' }];
  v.payout = chf(sp.payout);
  v.askHint =
    sa <= 0
      ? 'Enter an asking price.'
      : sellTopBid && sa <= sellTopBid
        ? 'At or below the highest bid — this sells instantly at ' + chf(sa) + '.'
        : sellLowAsk && sa < sellLowAsk
          ? 'Yours will be the lowest ask on the market.'
          : sellLowAsk
            ? chf(sa - sellLowAsk) + ' above the lowest ask — expect a slower sale.'
            : 'You’ll be the only seller in size ' + st.sSize + '.';
  v.askHintC = sa > 0 && (!sellLowAsk || sa <= sellLowAsk) ? ACC : '#E8B04B';
  v.review = sellShirt
    ? [['Shirt', sellShirt.name], ['Size', st.sSize], ['Condition', st.sCond], ['Edition', st.sEd], ['Player print', st.sPlayer || 'None'], ['Asking price', chf(sa)], ['You earn', chf(sp.payout)]].map(([k, val]) => ({ k, v: val }))
    : [];
  v.sBusy = !!st.sBusy;
  v.publish = async () => {
    if (!user) {
      go('auth', { authNotice: 'Bitte zuerst anmelden, um ein Trikot zu verkaufen.' });
      return;
    }
    if (!sellShirt || sa <= 0 || st.sBusy) return;
    setState({ sBusy: true });
    try {
      const placed = await db.placeAsk(user.id, { shirtId: sellShirt.id, size: st.sSize, amount: sa, condition: st.sCond, edition: st.sEd, playerPrint: st.sPlayer.trim() });
      const order = await db.findOrderForAsk(placed.id);
      setState({ sBusy: false, sPub: true, sPubResult: order ? { sold: true, amount: Number(order.amount) } : { sold: false, amount: sa } });
      reloadBook();
      top();
    } catch {
      setState({ sBusy: false });
      toast(t('toast.actionFailed'));
    }
  };
  const pubRes = st.sPubResult;
  v.pubSold = !!pubRes && pubRes.sold;
  v.pubTitle = v.pubSold ? 'Sold' : 'You’re live';
  v.pubText = !pubRes || !sellShirt
    ? ''
    : pubRes.sold
      ? 'Your ' + sellShirt.name + ' (size ' + st.sSize + ') matched a waiting buyer at ' + chf(pubRes.amount) + '. Once they pay, you’ll get a prepaid label to ship it to our Zürich vault.'
      : 'Your ' + sellShirt.name + ' (size ' + st.sSize + ') is listed at ' + chf(pubRes.amount) + '. Buyers watching this shirt see it now — we’ll notify you the moment it sells.';
  v.viewListing = () => sellShirt && open(sellShirt.id);
  v.listAnother = () => {
    sellScanToken.current++;
    setState({ sPub: false, sPubResult: null, sStep: 0, sShirt: null, sQuery: '', sScan: 'idle', sScanMsg: '', sScanMatch: null, sImg: null, sAsk: '', sPlayer: '' });
    top();
  };

  // PROFILE — only the signed-in user's own items; every number is derived
  // from them (no demo collection, no fabricated history).
  const customOwned = st.customItems.map((c) => decoCustomCard(c));
  const midOf = (val) => (val && !val.blocked ? val.mid : 0);
  const valueNow = st.customItems.reduce((a, c) => a + midOf(c.valuation), 0);
  const valueAdded = st.customItems.reduce((a, c) => a + midOf(c.initialValuation || c.valuation), 0);
  v.owned = customOwned;
  v.collectionEmpty = !customOwned.length;
  v.rejectedItems = customOwned.filter((c) => c.rejected).map((c) => ({ id: c.id, name: c.name, reason: c.rejectionReason, open: c.open }));
  v.hasRejected = v.rejectedItems.length > 0;
  v.pValue = chf(valueNow);
  v.pGain = (valueNow >= valueAdded ? '+' : '\u2212') + chf(Math.abs(valueNow - valueAdded));
  v.pGainPct = pct(valueAdded ? ((valueNow - valueAdded) / valueAdded) * 100 : 0);
  v.pGainColor = valueNow >= valueAdded ? ACC : NEG;
  v.pCount = String(st.customItems.length);
  // Verification breakdown replaces the old synthetic "value development" chart.
  const tierCount = (pred) => st.customItems.filter(pred).length;
  const tiers = [
    ['Expert-verified', tierCount((c) => c.verification.level === 'expert'), '#E8B04B'],
    ['Pre-checked', tierCount((c) => c.verification.level === 'precheck'), '#6FB6FF'],
    ['In review', tierCount((c) => c.verification.level !== 'expert' && ['angefragt', 'in Prüfung'].includes(c.verification.status)), '#C9D0CB'],
    ['Self-reported', tierCount((c) => c.verification.level === 'self' && !['angefragt', 'in Prüfung'].includes(c.verification.status)), '#8C958F']
  ];
  const tierTotal = Math.max(1, st.customItems.length);
  v.pTiers = tiers.map(([label, n, color]) => ({ label, n: String(n), color, width: (n / tierTotal) * 100 + '%' }));
  const sinceIso = user && user.created_at;
  v.memberSince = sinceIso ? new Date(sinceIso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '';
  v.userHandle = user ? '@' + user.email.split('@')[0] : '';
  v.expertCount = String(tiers[0][1]);
  v.hasExpert = tiers[0][1] > 0;
  v.pTabs = [['collection', 'Collection', st.customItems.length], ['watchlist', 'Watchlist', st.watch.length], ['orders', 'Orders', ordersNow.length]].map(([k, l, n]) => ({ label: l, n: String(n), color: st.pTab === k ? '#F2F4F1' : '#8C958F', bar: st.pTab === k ? ACC : 'transparent', pick: () => setState({ pTab: k }) }));
  v.tabCollection = st.pTab === 'collection';
  v.tabWatch = st.pTab === 'watchlist';
  v.tabOrders = st.pTab === 'orders';
  v.watchItems = st.watch.map((id) => deco(BY[id]));
  v.watchEmpty = !st.watch.length;
  v.orders = user ? ordersNow.map(decoOrder) : [];
  v.ordersEmpty = !v.orders.length;

  // Real, self-contained share link: the whole public-safe snapshot of the collection
  // is embedded in the URL hash (see utils/share.js), so it opens correctly for anyone,
  // in any browser, with no account/backend/localStorage required on their end.
  v.shareCollection = () => {
    const payload = {
      owner: v.userEmail.split('@')[0],
      handle: v.userHandle,
      totalFmt: v.pValue,
      items: v.owned.map((s) => ({
        id: s.id, name: s.name, size: s.size, priceFmt: s.priceFmt, pat: s.pat, trim: s.trim, crest: s.crest, glowA: s.glowA,
        isCustom: !!s.isCustom, badgeLabel: s.badgeLabel, badgeColor: s.badgeColor, badgeBg: s.badgeBg
      }))
    };
    const url = window.location.origin + window.location.pathname + '#/vault/' + encodeURIComponent(encodeShareData(payload));
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(
        () => toast('Öffentlicher Link kopiert \u00b7 read-only'),
        () => toast(url)
      );
    } else {
      toast(url);
    }
  };

  // PUBLIC VAULT — read-only view rendered purely from a decoded share-link payload,
  // intentionally independent of OWNED/customItems/localStorage so it works for any visitor.
  if (v.isPublicVault && st.publicData) {
    v.publicVault = {
      owner: st.publicData.owner,
      handle: st.publicData.handle,
      totalFmt: st.publicData.totalFmt,
      items: st.publicData.items || [],
      goHome: () => {
        if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search);
        go('home');
      }
    };
  }

  // ADMIN — human review queue for expert verification requests, now backed by
  // a real Supabase table (review_queue) with RLS restricting full visibility
  // to accounts flagged is_admin in `profiles` (see init_maillot_schema).
  if (v.isAdmin) {
    const pendingReviews = reviewQueueNow.filter((q) => q.status === 'pending' || q.status === 'in_review');
    const decoReview = (q) => {
      const cat = q.catalogId ? BY[q.catalogId] : null;
      const name = cat ? cat.name : q.proposedName || 'Unbenanntes Trikot';
      const photos = Object.keys(q.photos || {}).map((k) => ({ key: k, url: q.photos[k].dataUrl, label: q.photos[k].label || k }));
      return {
        id: q.id,
        name,
        version: q.version,
        sizeLine: q.sizeGroup + ' · ' + q.size + ' · ' + q.sleeve,
        conditionLine: 'Stufe ' + q.condition.grade + '/10' + (q.condition.defects.length ? ' · ' + q.condition.defects.join(', ') : ''),
        flockLine: q.flock.source === 'Keine' ? 'Kein Flock' : q.flock.source + (q.flock.name ? ' · ' + q.flock.name : '') + (q.flock.number ? ' #' + q.flock.number : '') + ' (' + q.flock.type + ')',
        patchesLine: q.patches.length ? q.patches.join(', ') : 'Keine',
        signatureLine: q.signature.signed ? 'Signiert von ' + (q.signature.by || 'unbekannt') + (q.signature.hasCoa ? ' · COA (' + (q.signature.issuer || 'unbekannt') + ')' : ' · kein COA') : 'Nicht signiert',
        provenance: q.provenance || '\u2014',
        precheck: q.precheck,
        photos,
        statusLabel: q.status === 'pending' ? 'Neu' : 'In Prüfung',
        submittedLabel: new Date(q.submittedAt).toLocaleString('de-CH'),
        approve: async () => {
          try {
            await db.resolveReview(q.id, true);
            setReviewQueueNow((prev) => prev.map((x) => (x.id === q.id ? { ...x, status: 'approved', reviewedAt: Date.now() } : x)));
          } catch (e) {
            toast('Fehler: ' + (e.message || e));
          }
        },
        reject: async (reason) => {
          try {
            await db.resolveReview(q.id, false, reason);
            setReviewQueueNow((prev) => prev.map((x) => (x.id === q.id ? { ...x, status: 'rejected', reason, reviewedAt: Date.now() } : x)));
          } catch (e) {
            toast('Fehler: ' + (e.message || e));
          }
        }
      };
    };
    v.adminDenied = !st.isAdmin;
    v.adminQueue = st.isAdmin ? pendingReviews.map(decoReview) : [];
    v.adminEmpty = st.isAdmin && !pendingReviews.length;
    v.adminStats = [
      ['Neu', reviewQueueNow.filter((q) => q.status === 'pending').length, '#C9D0CB'],
      ['In Prüfung', reviewQueueNow.filter((q) => q.status === 'in_review').length, '#6FB6FF'],
      ['Verifiziert', reviewQueueNow.filter((q) => q.status === 'approved').length, ACC],
      ['Abgelehnt', reviewQueueNow.filter((q) => q.status === 'rejected').length, '#FF6B5E']
    ].map(([label, n, color]) => ({ label, n: String(n), color }));
    v.adminHistory = reviewQueueNow
      .filter((q) => q.status === 'approved' || q.status === 'rejected')
      .sort((a, b) => b.reviewedAt - a.reviewedAt)
      .slice(0, 20)
      .map((q) => ({
        id: q.id,
        name: q.catalogId ? BY[q.catalogId].name : q.proposedName || 'Unbenanntes Trikot',
        status: q.status,
        statusLabel: q.status === 'approved' ? 'Verifiziert' : 'Abgelehnt',
        reason: q.reason,
        when: new Date(q.reviewedAt).toLocaleString('de-CH')
      }));
    v.adminBack = () => go('profile', { pTab: 'collection' });

    // DATA/API PRODUCT — admin-issued keys for the licensable price-index API
    // (see supabase edge function `price-index`). Plaintext only ever exists
    // once, right after creation; everything else here is metadata only.
    v.apiKeys = apiKeysNow.map((k) => ({
      id: k.id,
      label: k.label,
      prefix: k.key_prefix,
      createdLabel: new Date(k.created_at).toLocaleString('de-CH'),
      lastUsedLabel: k.last_used_at ? new Date(k.last_used_at).toLocaleString('de-CH') : 'Nie',
      revoked: !!k.revoked_at,
      revoke: () => v.apiKeyRevoke(k.id)
    }));
    v.newApiKey = newApiKey
      ? { plaintext: newApiKey.plaintext_key, prefix: newApiKey.key_prefix, dismiss: () => setNewApiKey(null) }
      : null;
    v.apiKeyCreate = async (label) => {
      try {
        const k = await db.createApiKey(label || 'API key');
        if (!k) return;
        setNewApiKey(k);
        setApiKeysNow((prev) => [{ id: k.id, label: label || 'API key', key_prefix: k.key_prefix, created_at: k.created_at, revoked_at: null, last_used_at: null }, ...prev]);
      } catch (e) {
        toast('Fehler: ' + (e.message || e));
      }
    };
    v.apiKeyRevoke = async (id) => {
      try {
        await db.revokeApiKey(id);
        setApiKeysNow((prev) => prev.map((k) => (k.id === id ? { ...k, revoked_at: new Date().toISOString() } : k)));
      } catch (e) {
        toast('Fehler: ' + (e.message || e));
      }
    };

    // DISPUTE/RETURNS WORKFLOW — admin resolution queue for orders a buyer or
    // seller flagged via disputeOrder() above. Resolving releases escrow to
    // the seller or refunds the buyer; the existing on_order_status_change DB
    // trigger notifies both parties automatically (see migration
    // dispute_resolution_rpcs / notify_order_status_change).
    const openDisputes = disputesNow.filter((d) => d.dispute_status === 'open');
    v.disputeQueue = openDisputes.map((d) => ({
      id: d.dispute_id,
      orderId: d.order_id,
      name: d.shirt_id ? (BY[d.shirt_id] ? BY[d.shirt_id].name : d.shirt_id) : 'Eigenes Trikot (' + d.custom_item_id + ')',
      size: d.size,
      amountFmt: chf(Number(d.amount)),
      reason: d.reason || '\u2014',
      createdLabel: new Date(d.created_at).toLocaleString('de-CH'),
      resolveRelease: (note) => v.disputeResolve(d.dispute_id, 'release', note),
      resolveRefund: (note) => v.disputeResolve(d.dispute_id, 'refund', note)
    }));
    v.disputeEmpty = !openDisputes.length;
    v.disputeHistory = disputesNow
      .filter((d) => d.dispute_status !== 'open')
      .slice(0, 20)
      .map((d) => ({
        id: d.dispute_id,
        name: d.shirt_id ? (BY[d.shirt_id] ? BY[d.shirt_id].name : d.shirt_id) : 'Eigenes Trikot (' + d.custom_item_id + ')',
        outcome: d.dispute_status === 'resolved_release' ? 'Freigegeben an Verkäufer' : 'Käufer erstattet',
        note: d.resolution_note
      }));
    v.disputeResolve = async (disputeId, outcome, note) => {
      try {
        await db.resolveDispute(disputeId, outcome, note);
        setDisputesNow((prev) =>
          prev.map((d) => (d.dispute_id === disputeId ? { ...d, dispute_status: 'resolved_' + outcome, resolution_note: note, order_status: outcome === 'release' ? 'released' : 'refunded' } : d))
        );
        toast('Streitfall gelöst');
      } catch (e) {
        toast('Fehler: ' + (e.message || e));
      }
    };
  }

  // VAULT ITEM DETAIL (self-added "Trikot hinzufügen" items)
  const vc = st.customItems.find((c) => c.id === st.vaultItemId);
  if (vc) {
    const card = decoCustomCard(vc);
    v.vaultItem = {
      id: vc.id, name: card.name, pat: card.pat, trim: card.trim, crest: card.crest, glowA: card.glowA,
      badgeLabel: card.badgeLabel, badgeColor: card.badgeColor, badgeBg: card.badgeBg, badgeDesc: card.badgeDesc,
      photos: Object.keys(vc.photos || {}).map((k) => ({ key: k, url: vc.photos[k].dataUrl, label: vc.photos[k].label || k })),
      version: vc.version, size: vc.size, sizeGroup: vc.sizeGroup, sleeve: vc.sleeve,
      flockLine: vc.flock.source === 'Keine' ? 'Kein Flock' : vc.flock.source + (vc.flock.name ? ' \u00b7 ' + vc.flock.name : '') + (vc.flock.number ? ' #' + vc.flock.number : '') + ' (' + vc.flock.type + ')',
      patchesLine: vc.patches.length ? vc.patches.join(', ') : 'Keine',
      signatureLine: vc.signature.signed ? 'Signiert von ' + (vc.signature.by || 'unbekannt') + (vc.signature.hasCoa ? ' \u00b7 COA vorhanden (' + (vc.signature.issuer || 'unbekannt') + ')' : ' \u00b7 kein COA') : 'Nicht signiert',
      tagsLine: vc.tagsAttached ? 'Ja (BNWT)' : 'Nein',
      conditionLine: 'Stufe ' + vc.condition.grade + '/10' + (vc.condition.defects.length ? ' \u00b7 ' + vc.condition.defects.join(', ') : ''),
      provenance: vc.provenance || '\u2014',
      visibilityLabel: { private: 'Privat', public: 'In öffentlicher Sammlung', offers: 'Offen für Angebote', forsale: 'Zum Verkauf' + (vc.salePrice ? ' \u00b7 ' + chf(vc.salePrice) : '') }[vc.visibility] || vc.visibility,
      valuation: vc.valuation,
      // Real (not fabricated) value history: only populated when an expert verification has
      // actually recalculated the estimate since it was first self-reported — see addCustomItem
      // / the review-queue sync effect above, which are the only two places `valuation` changes.
      valueChange: (() => {
        const from = vc.initialValuation,
          to = vc.valuation;
        if (!from || from.blocked || !to || to.blocked || from.mid === to.mid) return null;
        const diffPct = ((to.mid - from.mid) / from.mid) * 100;
        const up = diffPct >= 0;
        return { fromFmt: chf(from.mid), toFmt: chf(to.mid), pctFmt: pct(diffPct), color: up ? ACC : NEG, bg: up ? 'rgba(75,255,139,0.12)' : 'rgba(255,107,94,0.13)' };
      })(),
      createdLabel: new Date(vc.createdAt).toLocaleDateString('de-CH', { day: 'numeric', month: 'short', year: 'numeric' }),
      verification: vc.verification,
      retryVerification: vc.verification.status === 'abgelehnt' ? () => retryVerification(vc.id) : null,
      precheck: vc.precheck,
      back: () => go('profile', { pTab: 'collection' })
    };
  }

  return { state: st, v };
}

// Size the detail page shows: the requested one if the shirt comes in it,
// otherwise M, otherwise its only size (match-worn pieces).
function resolveSize(shirt, wanted) {
  return shirt.sizes.includes(wanted) ? wanted : shirt.sizes.includes('M') ? 'M' : shirt.sizes[0];
}

// Live order book (open asks/bids) for one shirt/size, polled only while the
// detail page is open. Returns [book, reload] so a just-placed bid shows up
// without waiting for the next tick.
function useOrderBook(shirtId, size, active) {
  const [book, setBook] = useState({ key: '', bids: [], asks: [] });
  const [nonce, setNonce] = useState(0);
  const key = shirtId + '|' + size;
  useEffect(() => {
    if (!active || !shirtId || !size) return;
    let cancelled = false;
    const sync = () => {
      db.loadOrderBook(shirtId, size)
        .then((b) => !cancelled && setBook({ key: shirtId + '|' + size, ...b }))
        .catch(() => {});
    };
    sync();
    const interval = setInterval(sync, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [shirtId, size, active, nonce]);
  // Never show the previous shirt/size's book while the new one loads.
  const current = book.key === key ? book : EMPTY_BOOK;
  return [current, () => setNonce((n) => n + 1)];
}
const EMPTY_BOOK = { key: '', bids: [], asks: [] };

// Site-wide aggregate stats for the homepage hero (see public_stats()).
function usePublicStats(active) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    db.loadPublicStats()
      .then((x) => !cancelled && setStats(x))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [active]);
  return stats;
}

// Per-shirt community stats (watchers, listings, completed sales) for the
// product page; tagged with the shirt id so a stale result never shows.
function useShirtStats(shirtId, active) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    if (!active || !shirtId) return;
    let cancelled = false;
    db.loadShirtStats(shirtId)
      .then((x) => !cancelled && setStats({ id: shirtId, stats: x }))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [shirtId, active]);
  return stats;
}

// Small helper hook: loads the full review queue for the admin screen and
// keeps it client-cached across the two "approve/reject" handlers above
// (which patch it optimistically rather than re-fetching on every click).
function useAdminQueue(isAdmin, view) {
  const [queue, setQueue] = useState([]);
  useEffect(() => {
    if (!isAdmin || view !== 'admin') return;
    let cancelled = false;
    db.loadReviewQueue()
      .then((q) => !cancelled && setQueue(q))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAdmin, view]);
  return [queue, setQueue];
}

// Small helper hook: loads the licensable price-index API's issued keys,
// gated to the admin view exactly like useAdminQueue above — nobody but an
// admin ever triggers a read of api_keys (RLS would reject it anyway).
function useApiKeys(isAdmin, view) {
  const [keys, setKeys] = useState([]);
  useEffect(() => {
    if (!isAdmin || view !== 'admin') return;
    let cancelled = false;
    db.loadApiKeys()
      .then((k) => !cancelled && setKeys(k))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAdmin, view]);
  return [keys, setKeys];
}

// Small helper hook: loads the cross-user dispute queue (via the
// list_disputes_for_admin RPC) for the admin resolution panel, gated to the
// admin view exactly like useAdminQueue/useApiKeys above.
function useDisputes(isAdmin, view) {
  const [disputes, setDisputes] = useState([]);
  useEffect(() => {
    if (!isAdmin || view !== 'admin') return;
    let cancelled = false;
    db.loadDisputesForAdmin()
      .then((d) => !cancelled && setDisputes(d))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAdmin, view]);
  return [disputes, setDisputes];
}

// Small helper hook: loads/polls this user's orders (buyer or seller side)
// only while the Profile "Orders" tab is actually open \u2014 same lazy-polling
// shape as useAdminQueue above, so an idle profile never hits the network.
function useOrders(userId, view, pTab) {
  const [orders, setOrders] = useState([]);
  useEffect(() => {
    if (!userId || view !== 'profile' || pTab !== 'orders') return;
    let cancelled = false;
    const sync = () => {
      db.loadMyOrders(userId)
        .then((o) => !cancelled && setOrders(o))
        .catch(() => {});
    };
    sync();
    const interval = setInterval(sync, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [userId, view, pTab]);
  return [orders, setOrders];
}

// Small helper hook: polls this user's notifications (bid matches, order
// status changes, disputes \u2014 see the Postgres triggers that insert into
// `notifications`) so the header bell stays live across every view, not just
// a specific tab. Longer interval than useOrders()/useAdminQueue() since it's
// always-on rather than gated to one screen.
function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const sync = () => {
      db.loadNotifications(userId)
        .then((n) => !cancelled && setNotifications(n))
        .catch(() => {});
    };
    sync();
    const interval = setInterval(sync, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [userId]);
  return [notifications, setNotifications];
}

// Small helper hook: polls the aggregated, site-wide trending_scores() RPC
// (see the "trending_scores_rpc" migration) while the homepage is open. Only
// gated to the home view, like useAdminQueue()/useOrders() above, since it's
// the one place the score is shown.
function useTrendingScores(view) {
  const [scores, setScores] = useState({});
  useEffect(() => {
    if (view !== 'home') return;
    let cancelled = false;
    const sync = () => {
      db.loadTrendingScores()
        .then((rows) => !cancelled && setScores(Object.fromEntries(rows.map((r) => [r.shirt_id, Number(r.score)]))))
        .catch(() => {});
    };
    sync();
    const interval = setInterval(sync, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [view]);
  return scores;
}

// Small helper hook: loads this user's own recent events (view/watch/bid/buy)
// to drive the "Recommended for you" row on the homepage. Unlike
// useTrendingScores() above this reads public.events directly — the
// events_select_own RLS policy already restricts that to the signed-in
// user's own rows, so no RPC is needed for a personal history read.
function usePersonalEvents(userId, view) {
  const [events, setEvents] = useState([]);
  useEffect(() => {
    if (!userId || view !== 'home') return;
    let cancelled = false;
    db.loadRecentEvents(new Date(Date.now() - 30 * MS).toISOString())
      .then((rows) => !cancelled && setEvents(rows))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId, view]);
  return events;
}
