import { useEffect, useRef, useState } from 'react';
import { ACC, NEG, BY, SHIRTS, OWNED, PORT, EMPTY, RANGES, SIZES, MULT, CONDS, chf, pct, hexA, down, linePath, uniq, TODAY } from './data.js';
import { loadJSON, saveJSON } from './utils/storage.js';
import { estimateValue } from './addShirtData.js';
import { encodeShareData, parseShareHash } from './utils/share.js';
import { buyerCheckoutFees, sellerPayout } from './fees.js';
import { useAuth } from './utils/useAuth.js';
import { supabase } from './utils/supabase.js';
import * as db from './utils/db.js';

const MS = 864e5;
// Demo watchlist shown to signed-out visitors browsing the catalogue — once a
// user signs in, this is replaced by their real Supabase-backed watchlist.
const DEMO_WATCH = ['nap-8788', 'bra-70', 'mia-26', 'fra-98', 'boc-81'];

// Escrow order status \u2192 label/color, used by the Profile "Orders" tab.
const ORDER_STATUS = {
  pending_payment: { label: 'Zahlung ausstehend', color: '#E8B04B', bg: 'rgba(232,176,75,0.14)' },
  paid_escrow: { label: 'Bezahlt \u00b7 in Treuhand', color: '#6FB6FF', bg: 'rgba(111,182,255,0.12)' },
  shipped: { label: 'Versendet', color: '#6FB6FF', bg: 'rgba(111,182,255,0.12)' },
  delivered: { label: 'Geliefert', color: ACC, bg: 'rgba(75,255,139,0.12)' },
  released: { label: 'Abgeschlossen', color: ACC, bg: 'rgba(75,255,139,0.12)' },
  disputed: { label: 'Reklamiert', color: NEG, bg: 'rgba(255,107,94,0.13)' },
  cancelled: { label: 'Storniert', color: '#8C958F', bg: 'rgba(255,255,255,0.06)' },
  refunded: { label: 'Rückerstattet', color: '#8C958F', bg: 'rgba(255,255,255,0.06)' }
};

function initialState() {
  const shared = typeof window !== 'undefined' ? parseShareHash(window.location.hash) : undefined;
  return {
    view: shared !== undefined ? 'publicvault' : 'home', id: 'ger-26', q: '', heroQ: '', filters: EMPTY, minPrice: 0, maxPrice: 600, sort: 'trending', size: 'M', range: '1Y', hover: null, imgView: 0,
    watch: DEMO_WATCH, modal: null, modalDone: false, bidAmt: '', exp: '30 days', pay: 'TWINT', toast: null, w: typeof window !== 'undefined' ? window.innerWidth : 1280, showFilters: false, moreClubs: false, movers: 'up',
    sStep: 0, sScan: 'idle', sProg: 0, sImg: null, sSize: 'L', sCond: 'Very good', sEd: 'Replica', sPlayer: 'Del Piero 10', sAsk: '235', sPub: false, pTab: 'collection', pRange: '1Y',
    customItems: [], vaultItemId: null, publicData: shared,
    // Auth / account (Phase 6: real Supabase Auth, replaces the old anonymous,
    // single-device localStorage model).
    isAdmin: false, dataLoaded: false, notifications: [],
    authMode: 'signin', authEmail: '', authPassword: '', authError: '', authBusy: false, authNotice: ''
    // `orders` itself is NOT seeded here — it's loaded/polled lazily by
    // useOrders() only while the Profile "Orders" tab is actually open.
  };
}

export function useMaillot() {
  const [state, setRaw] = useState(initialState);
  const toastTimer = useRef(null);
  const scanTimer = useRef(null);
  const { user, authLoading, signUp, signIn, signOut } = useAuth();
  const [reviewQueueNow, setReviewQueueNow] = useAdminQueue(state.isAdmin, state.view);
  const [ordersNow, setOrdersNow] = useOrders(user ? user.id : null, state.view, state.pTab);

  const setState = (patch) => setRaw((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));

  useEffect(() => {
    const onR = () => setState({ w: window.innerWidth });
    window.addEventListener('resize', onR);
    onR();
    return () => {
      window.removeEventListener('resize', onR);
      clearInterval(scanTimer.current);
      clearTimeout(toastTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real per-account data load: once a Supabase session exists, pull this
  // user's custom items, watchlist and notifications from Postgres. On
  // sign-out, fall back to the signed-out demo state (no account = no
  // persisted collection, same as any real marketplace).
  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setState({ customItems: [], watch: DEMO_WATCH, notifications: [], isAdmin: false, dataLoaded: !authLoading });
      return;
    }
    (async () => {
      try {
        const [profile, customItems, watch, notifications] = await Promise.all([
          supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle().then((r) => r.data),
          db.loadCustomItems(user.id),
          db.loadWatchlist(user.id),
          db.loadNotifications(user.id)
        ]);
        if (cancelled) return;
        setState({ customItems, watch, notifications, isAdmin: !!(profile && profile.is_admin), dataLoaded: true });
      } catch (e) {
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
      } catch (e) {
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
      } catch (e) {
        /* best-effort */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.view, state.isAdmin]);

  // Stripe Checkout redirects back here via success_url/cancel_url hash
  // fragments (see db.createCheckoutSession / the "checkout" edge function) \u2014
  // detect those once on mount, clean the URL, and land the buyer on their
  // Orders tab with a toast reflecting the outcome.
  useEffect(() => {
    const h = window.location.hash;
    if (h.startsWith('#order-success')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      setState({ view: 'profile', pTab: 'orders' });
      toast('Zahlung erfolgreich \u2014 Betrag wird bis zur Lieferbestätigung treuhänderisch verwahrt.');
    } else if (h.startsWith('#order-cancel')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      setState({ view: 'profile', pTab: 'orders' });
      toast('Zahlung abgebrochen.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const top = () => {
    try {
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (e) {
      window.scrollTo(0, 0);
    }
  };
  const go = (view, extra) => {
    setState({ view, modal: null, hover: null, ...(extra || {}) });
    top();
  };
  const requireAuth = (view, extra) => {
    if (user) {
      go(view, extra);
      return true;
    }
    go('auth', { authNotice: 'Bitte zuerst anmelden.' });
    return false;
  };
  const open = (id) => {
    const s = BY[id];
    go('detail', { id, imgView: 0, range: '1Y', size: s.sizes.find((z) => s.avail[z] && z === 'M') || s.sizes.find((z) => s.avail[z]) });
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
  const browseWith = (o) => go('browse', { q: o.q || '', filters: Object.assign({}, EMPTY, o.f || {}), minPrice: 0, maxPrice: o.max || 600 });
  const toggleF = (k, val) => {
    const f = Object.assign({}, state.filters);
    f[k] = f[k].includes(val) ? f[k].filter((x) => x !== val) : [...f[k], val];
    setState({ filters: f });
  };
  const startScan = (img) => {
    clearInterval(scanTimer.current);
    setState({ sScan: 'scanning', sProg: 0, sImg: img || null });
    scanTimer.current = setInterval(() => {
      setRaw((s) => {
        const p = s.sProg + 1.5;
        if (p >= 100) {
          clearInterval(scanTimer.current);
          return { ...s, sProg: 100, sScan: 'done' };
        }
        return { ...s, sProg: p };
      });
    }, 45);
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
    const st = ORDER_STATUS[o.status] || { label: o.status, color: '#8C958F', bg: 'rgba(255,255,255,0.06)' };
    const actions = [];
    if (isBuyer && o.status === 'pending_payment') {
      actions.push({ label: 'Jetzt bezahlen', primary: true, run: () => payOrder(o.id) });
      actions.push({ label: 'Stornieren', danger: true, run: () => cancelOrder(o.id) });
    }
    if (!isBuyer && o.status === 'paid_escrow') {
      actions.push({ label: 'Als versendet markieren', primary: true, run: () => shipOrder(o.id) });
    }
    if (isBuyer && o.status === 'shipped') {
      actions.push({ label: 'Erhalt bestätigen & Treuhand freigeben', primary: true, run: () => releaseOrder(o.id) });
    }
    if (o.status === 'paid_escrow' || o.status === 'shipped') {
      actions.push({ label: 'Reklamation einreichen', run: () => disputeOrder(o.id) });
    }
    return {
      id: o.id, isBuyer, roleLabel: isBuyer ? 'Kauf' : 'Verkauf',
      name: shirt ? shirt.name : o.shirt_id, size: o.size, totalFmt: chf(total),
      statusLabel: st.label, statusColor: st.color, statusBg: st.bg,
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
        toast(res.message || 'Zahlungen sind noch nicht konfiguriert.');
        return;
      }
      window.location.href = res.url;
    } catch (e) {
      toast('Zahlung konnte nicht gestartet werden \u2014 bitte erneut versuchen.');
    }
  };
  const shipOrder = async (orderId) => {
    try {
      await db.updateOrderStatus(orderId, 'shipped', { shipped_at: new Date().toISOString() });
      setOrdersNow((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'shipped' } : o)));
      toast('Als versendet markiert');
    } catch (e) {
      toast('Aktion fehlgeschlagen \u2014 bitte erneut versuchen.');
    }
  };
  const releaseOrder = async (orderId) => {
    try {
      const now = new Date().toISOString();
      await db.updateOrderStatus(orderId, 'released', { delivered_at: now, released_at: now });
      setOrdersNow((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'released' } : o)));
      toast('Erhalt bestätigt \u00b7 Treuhand freigegeben');
    } catch (e) {
      toast('Aktion fehlgeschlagen \u2014 bitte erneut versuchen.');
    }
  };
  const disputeOrder = async (orderId) => {
    if (!user) return;
    const reason = window.prompt('Grund für die Reklamation:');
    if (!reason) return;
    try {
      await db.openDispute(orderId, user.id, reason);
      await db.updateOrderStatus(orderId, 'disputed');
      setOrdersNow((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'disputed' } : o)));
      toast('Reklamation eingereicht');
    } catch (e) {
      toast('Reklamation fehlgeschlagen \u2014 bitte erneut versuchen.');
    }
  };
  const cancelOrder = async (orderId) => {
    try {
      await db.updateOrderStatus(orderId, 'cancelled');
      setOrdersNow((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'cancelled' } : o)));
      toast('Bestellung storniert');
    } catch (e) {
      toast('Stornieren fehlgeschlagen \u2014 bitte erneut versuchen.');
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
    toast('Abgemeldet');
    go('home');
  };
  const navDefs = [
    ['home', 'Discover', 'Discover'],
    ['browse', 'Marketplace', 'Market'],
    ['sell', 'Sell', 'Sell'],
    ['profile', 'My Collection', 'Collection']
  ];
  if (st.isAdmin) navDefs.push(['admin', 'Admin', 'Admin']);
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
        setState({ authError: 'E-Mail und Passwort erforderlich.' });
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
        toast('Konto erstellt \u2014 bitte E-Mail bestätigen falls nötig, dann anmelden.');
        setState({ authMode: 'signin' });
      } else {
        toast('Angemeldet');
        go('profile', { pTab: 'collection' });
      }
    }
  };

  // HOME
  const T = ['ger-26', 'sui-26', 'acm-0607', 'mia-26', 'ars-91', 'fcb-2627', 'nap-8788', 'ned-88'];
  v.trending = T.map((id) => deco(BY[id]));
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
  v.indices = [['KV 100', '1\u2019284.6', 3.2], ['Retro \u201990s', '842.1', 8.4], ['Match-worn', '2\u2019410.0', 5.1], ['World Cup \u201926', '318.7', 14.6], ['Swiss SL', '96.3', 1.2], ['Premier League', '512.9', -0.8], ['Serie A', '677.4', 4.3]].map(([l, val, c]) => ({ label: l, val, ch: pct(c), color: c >= 0 ? ACC : NEG }));

  // BROWSE
  const f = st.filters,
    words = st.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const keyOf = { type: 'type', league: 'league', brand: 'brand', decade: 'decade', condition: 'cond', club: 'club' };
  let list = SHIRTS.filter((s) => words.every((w) => s.hay.includes(w)) && Object.keys(keyOf).every((k) => !f[k].length || f[k].includes(s[keyOf[k]])) && s.price >= st.minPrice && s.price <= st.maxPrice);
  const sorts = { trending: (a, b) => b.trend - a.trend, newest: (a, b) => a.added - b.added, asc: (a, b) => a.price - b.price, desc: (a, b) => b.price - a.price, gain: (a, b) => b.ch - a.ch };
  list.sort(sorts[st.sort]);
  v.results = list.map((s) => deco(s));
  v.noResults = !list.length;
  v.resultLabel = list.length + ' of ' + SHIRTS.length + ' shirts \u00b7 prices = lowest ask';
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
  const s = BY[st.id] || BY['ger-26'];
  const d = deco(s);
  v.d = d;
  const size = s.sizes.includes(st.size) && s.avail[st.size] ? st.size : s.sizes.find((z) => s.avail[z]);
  const askOf = (z) => Math.round(s.price * (s.type === 'Match-worn' ? 1 : MULT[z]));
  const ask = askOf(size),
    bid = Math.round(ask * 0.88),
    last = Math.round(s.sales[0].p * (s.type === 'Match-worn' ? 1 : MULT[size]));
  v.sizeSel = size;
  v.isOneSize = s.type === 'Match-worn';
  v.multiSize = !v.isOneSize;
  v.sizeOpts = s.sizes.map((z) => {
    const on = z === size,
      av = s.avail[z];
    return { label: z, price: av ? chf(askOf(z)) : 'Sold out', bg: on ? 'rgba(75,255,139,0.1)' : '#121514', border: on ? ACC : 'rgba(255,255,255,0.08)', op: av ? 1 : 0.38, cur: av ? 'pointer' : 'not-allowed', pick: () => av && setState({ size: z }) };
  });
  v.askFmt = chf(ask);
  v.bidFmtTop = chf(bid);
  v.lastFmt = chf(last);
  v.lastDelta = pct(((ask - last) / last) * 100) + ' vs ask';
  v.watched = st.watch.includes(s.id);
  v.watchLabel = v.watched ? 'Watching' : 'Watch';
  v.watchToggle = () => toggleWatch(s.id);
  v.ownersLabel = s.type === 'Match-worn' ? '1 of 1 \u00b7 unique' : s.owners.toLocaleString('de-CH') + ' own';
  v.wantsLabel = s.wants.toLocaleString('de-CH') + ' want';
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
    ['Total sales', (s.type === 'Match-worn' ? 3 : Math.round(s.owners * 0.34)).toLocaleString('de-CH')],
    ['Price premium vs retail', s.type === 'New' ? pct(s.ch * 0.8) : 'Retro \u00b7 n/a']
  ].map(([k, val]) => ({ k, v: val }));
  v.sales = s.sales.map((x) => ({ date: new Date(TODAY - x.o * MS).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), size: x.size, price: chf(x.p * (s.type === 'Match-worn' ? 1 : MULT[x.size] || 1)), cond: s.cond }));
  v.comments = s.cm.map((c) => ({ u: '@' + c.u, t: c.t, d: c.d, ini: c.u.slice(0, 2).toUpperCase() }));
  v.related = SHIRTS.filter((x) => x.id !== s.id && (x.league === s.league || x.type === s.type)).sort((a, b) => b.trend - a.trend).slice(0, 4).map((x) => deco(x));
  v.openBuy = () => setState({ modal: 'buy', modalDone: false });
  v.openBid = () => setState({ modal: 'bid', modalDone: false, bidAmt: String(bid + 5) });
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
  v.closeModal = () => setState({ modal: null, modalDone: false });
  const bf = buyerCheckoutFees(ask);
  v.buyRows = [{ k: 'Lowest ask \u00b7 size ' + size, v: chf(ask) }, { k: 'Authentication (Z\u00fcrich)', v: chf(bf.authFee) }, { k: 'Insured shipping', v: chf(bf.shipping) }];
  v.buyTotal = chf(bf.total);
  v.payOpts = ['TWINT', 'Card', 'Apple Pay'].map((p) => ({ label: p, bg: st.pay === p ? 'rgba(75,255,139,0.08)' : '#161A18', border: st.pay === p ? ACC : 'rgba(255,255,255,0.08)', pick: () => setState({ pay: p }) }));
  const ba = parseInt(st.bidAmt, 10) || 0;
  v.bidAmt = st.bidAmt;
  v.onBidAmt = (e) => setState({ bidAmt: e.target.value.replace(/[^0-9]/g, '') });
  v.bidFmt = chf(ba);
  v.bidQuick = [['Beat highest bid', bid + 1], ['Strong bid', Math.round((bid + ask) / 2)], ['Buy at ask', ask]].map(([k, n]) => ({ k, v: chf(n), pick: () => setState({ bidAmt: String(n) }) }));
  v.expOpts = ['7 days', '14 days', '30 days', '60 days'].map((x) => ({ label: x, bg: st.exp === x ? 'rgba(75,255,139,0.08)' : '#161A18', border: st.exp === x ? ACC : 'rgba(255,255,255,0.08)', pick: () => setState({ exp: x }) }));
  v.bidHint = ba >= ask ? 'Your bid matches the lowest ask \u2014 this will execute as an instant purchase.' : ba > bid ? 'You\u2019ll be the highest bidder. Sellers are notified instantly.' : 'Below the current highest bid (' + chf(bid) + '). Sellers rarely accept bids this low.';
  v.bidHintColor = ba > bid ? ACC : '#E8B04B';
  // Real checkout + order-book path: a logged-in buyer's "Buy"/"Bid" writes a
  // genuine row to orders/bids (see utils/db.js + the match_order_book() DB
  // trigger) instead of just flipping a local `modalDone` flag. Payment capture
  // itself is still a placeholder (see utils/payments.js) until Stripe/TWINT
  // keys are configured — see AUDIT NOTE there.
  v.confirmModal = () => {
    if (st.modal === 'bid' && !ba) return;
    if (!user) {
      setState({ modal: null });
      go('auth', { authNotice: 'Bitte zuerst anmelden, um zu kaufen oder zu bieten.' });
      return;
    }
    setState({ modalDone: true });
    if (st.modal === 'buy') {
      db.logEvent(user.id, s.id, 'buy').catch(() => {});
      db.placeAsk(user.id, { shirtId: s.id, size, amount: ask }).catch(() => {});
      db.placeBid(user.id, s.id, size, ask).catch(() => {});
    } else {
      db.logEvent(user.id, s.id, 'bid').catch(() => {});
      db.placeBid(user.id, s.id, size, ba).catch(() => {});
    }
  };
  v.doneTitle = st.modal === 'buy' ? 'Order confirmed' : 'Bid placed';
  v.doneText = st.modal === 'buy' ? 'Your ' + s.name + ' (size ' + size + ') is on its way to the Maillot authentication centre in Z\u00fcrich. Verified items ship within 2\u20134 days.' : 'Your bid of ' + chf(ba) + ' is live for ' + st.exp + '. We\u2019ll ping you the moment a seller accepts.';

  // SELL
  const sj = deco(BY['juv-9697']);
  v.sj = sj;
  v.sellSteps = ['AI Scan', 'Details', 'Price', 'Review'].map((l, i) => ({ n: String(i + 1), label: l, bg: i < st.sStep ? ACC : i === st.sStep ? '#F2F4F1' : '#1A1F1C', color: i <= st.sStep ? '#0A0C0B' : '#8C958F', lc: i <= st.sStep ? '#F2F4F1' : '#8C958F', bar: i < st.sStep ? ACC : 'rgba(255,255,255,0.1)', notLast: i < 3 }));
  v.s0 = st.sStep === 0 && !st.sPub;
  v.s1 = st.sStep === 1 && !st.sPub;
  v.s2 = st.sStep === 2 && !st.sPub;
  v.s3 = st.sStep === 3 && !st.sPub;
  v.sPub = st.sPub;
  v.sFlow = !st.sPub;
  v.scanIdle = st.sScan === 'idle';
  v.scanActive = st.sScan !== 'idle';
  v.scanning = st.sScan === 'scanning';
  v.scanDone = st.sScan === 'done';
  v.hasUpload = !!st.sImg;
  v.noUpload = !st.sImg;
  v.sImgBg = st.sImg ? 'url("' + st.sImg + '")' : 'none';
  v.onFile = (e) => { const fl = e.target.files && e.target.files[0]; if (fl) startScan(URL.createObjectURL(fl)); };
  v.sampleScan = () => startScan(null);
  v.rescan = () => { clearInterval(scanTimer.current); setState({ sScan: 'idle', sProg: 0, sImg: null }); };
  const pr = st.sProg;
  v.scanTop = pr + '%';
  v.scanPct = Math.round(pr) + '%';
  v.scanW = pr + '%';
  v.lineOp = st.sScan === 'scanning' ? 1 : 0;
  v.box1 = pr > 28 ? 1 : 0;
  v.box2 = pr > 52 ? 1 : 0;
  v.box3 = pr > 72 ? 1 : 0;
  v.scanMsg = pr < 30 ? 'Detecting crest & badge\u2026' : pr < 55 ? 'Reading collar, cuffs & brand marks\u2026' : pr < 80 ? 'Matching against 48\u2019210 catalogue entries\u2026' : pr < 100 ? 'Pricing from 41 recent sales\u2026' : 'Identified with 96% confidence';
  v.scanChecks = [['Crest & badge', 28], ['Brand & collar pattern', 52], ['Season match', 72], ['Market pricing', 99]].map(([l, t]) => ({ label: l, done: pr > t, ic: pr > t ? ACC : 'rgba(255,255,255,0.15)', c: pr > t ? '#F2F4F1' : '#8C958F' }));
  v.aiFields = [['Club', 'Juventus', '98%'], ['Season', '1996/97 Home', '94%'], ['Brand', 'Kappa', '99%'], ['Edition', 'Replica \u00b7 short sleeve', '91%']].map(([k, val, c]) => ({ k, v: val, c }));
  v.sNext = () => { setState({ sStep: Math.min(3, st.sStep + 1) }); top(); };
  v.sBack = () => { setState({ sStep: Math.max(0, st.sStep - 1) }); top(); };
  v.canBack = st.sStep > 0;
  v.nextLabel = st.sStep === 2 ? 'Review listing' : 'Continue';
  v.showNext = st.sStep > 0 && st.sStep < 3;
  v.sSizes = SIZES.map((z) => ({ label: z, bg: st.sSize === z ? 'rgba(75,255,139,0.1)' : '#121514', border: st.sSize === z ? ACC : 'rgba(255,255,255,0.08)', pick: () => setState({ sSize: z }) }));
  v.sConds = [['New with tags', 'Never worn, original tags attached'], ['Excellent', 'Worn lightly, no visible flaws'], ['Very good', 'Minor signs of wear, print intact'], ['Good', 'Visible wear, fading or small marks']].map(([l, dsc]) => ({ label: l, desc: dsc, bg: st.sCond === l ? 'rgba(75,255,139,0.07)' : '#121514', border: st.sCond === l ? ACC : 'rgba(255,255,255,0.08)', pick: () => setState({ sCond: l }) }));
  v.sEds = ['Replica', 'Authentic', 'Player issue', 'Match-worn'].map((x) => ({ label: x, bg: st.sEd === x ? '#F2F4F1' : 'transparent', color: st.sEd === x ? '#0A0C0B' : '#C9D0CB', pick: () => setState({ sEd: x }) }));
  v.sPlayer = st.sPlayer;
  v.onPlayer = (e) => setState({ sPlayer: e.target.value });
  const sa = parseInt(st.sAsk, 10) || 0;
  v.sAsk = st.sAsk;
  v.onAsk = (e) => setState({ sAsk: e.target.value.replace(/[^0-9]/g, '') });
  const posOf = (n) => Math.max(0, Math.min(100, ((n - 180) / (280 - 180)) * 100)) + '%';
  v.mkMarks = [['Highest bid', 210, '#C9D0CB'], ['Lowest ask', 235, ACC], ['Last sale', 238, '#E8B04B']].map(([l, n, c]) => ({ l, v: chf(n), left: posOf(n), c }));
  v.yourLeft = posOf(sa);
  v.askFmtS = chf(sa);
  v.sQuick = [['Match lowest ask', 235], ['Undercut by 5', 230], ['Sell faster', 220]].map(([l, n]) => ({ label: l, v: chf(n), pick: () => setState({ sAsk: String(n) }) }));
  const sp = sellerPayout(sa);
  v.payRows = [{ k: 'Your ask', v: chf(sa) }, { k: 'Seller fee (8%)', v: '\u2212' + chf(sp.commission) }, { k: 'Authentication', v: 'Free' }, { k: 'Shipping to vault', v: 'Prepaid label' }];
  v.payout = chf(sp.payout);
  v.askHint = sa <= 0 ? 'Enter an asking price.' : sa <= 235 ? 'Your ask will be the lowest on the market \u2014 similar listings sold within 3 days.' : chf(sa - 235) + ' above the lowest ask. Expect a slower sale.';
  v.askHintC = sa > 0 && sa <= 235 ? ACC : '#E8B04B';
  v.review = [['Shirt', 'Juventus 1996/97 Home'], ['Size', st.sSize], ['Condition', st.sCond], ['Edition', st.sEd], ['Player print', st.sPlayer || 'None'], ['Asking price', chf(sa)], ['You earn', chf(sp.payout)]].map(([k, val]) => ({ k, v: val }));
  v.publish = () => {
    if (!user) {
      go('auth', { authNotice: 'Bitte zuerst anmelden, um ein Trikot zu verkaufen.' });
      return;
    }
    setState({ sPub: true });
    top();
    db.placeAsk(user.id, { shirtId: 'juv-9697', size: st.sSize, amount: sa }).catch(() => {});
  };
  v.viewListing = () => open('juv-9697');
  v.listAnother = () => { clearInterval(scanTimer.current); setState({ sPub: false, sStep: 0, sScan: 'idle', sProg: 0, sImg: null }); top(); };

  // PROFILE
  const owned = OWNED.map((o) => {
    const x = BY[o.id];
    const g = ((x.price - o.cost) / o.cost) * 100;
    return Object.assign(deco(x), { paid: 'Paid ' + chf(o.cost), gain: pct(g), gainC: g >= 0 ? ACC : NEG, size: o.size, when: o.when });
  });
  const tot = OWNED.reduce((a, o) => a + BY[o.id].price, 0),
    cost = OWNED.reduce((a, o) => a + o.cost, 0);
  const customOwned = st.customItems.map((c) => decoCustomCard(c));
  const customVal = st.customItems.reduce((a, c) => a + (c.valuation && !c.valuation.blocked ? c.valuation.mid : 0), 0);
  const totAll = tot + customVal,
    costAll = cost + customVal;
  v.owned = [...owned, ...customOwned];
  v.rejectedItems = customOwned.filter((c) => c.rejected).map((c) => ({ id: c.id, name: c.name, reason: c.rejectionReason, open: c.open }));
  v.hasRejected = v.rejectedItems.length > 0;
  v.pValue = chf(totAll);
  v.pGain = (totAll >= costAll ? '+' : '\u2212') + chf(Math.abs(totAll - costAll));
  v.pGainPct = pct(costAll ? ((totAll - costAll) / costAll) * 100 : 0);
  v.pCount = String(OWNED.length + st.customItems.length);
  const pd = PORT.slice(-RANGES[st.pRange]);
  const pl = linePath(down(pd, 120), 1000, 240, 20);
  v.pLine = pl.d;
  v.pArea = pl.area;
  v.pRangeCh = pct(((pd[pd.length - 1] - pd[0]) / pd[0]) * 100);
  v.pTop = chf(pl.mx);
  v.pBot = chf(pl.mn);
  v.pRanges = ['3M', '6M', '1Y'].map((k) => ({ label: k, bg: st.pRange === k ? '#F2F4F1' : 'transparent', color: st.pRange === k ? '#0A0C0B' : '#C9D0CB', pick: () => setState({ pRange: k }) }));
  v.pTabs = [['collection', 'Collection', OWNED.length], ['watchlist', 'Watchlist', st.watch.length], ['orders', 'Orders', ordersNow.length]].map(([k, l, n]) => ({ label: l, n: String(n), color: st.pTab === k ? '#F2F4F1' : '#8C958F', bar: st.pTab === k ? ACC : 'transparent', pick: () => setState({ pTab: k }) }));
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
      owner: v.userEmail ? v.userEmail.split('@')[0] : 'Luca Meier',
      handle: v.userEmail ? '@' + v.userEmail.split('@')[0] : '@vintage.luca',
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
          await db.resolveReview(q.id, true).catch(() => {});
          setReviewQueueNow((prev) => prev.map((x) => (x.id === q.id ? { ...x, status: 'approved' } : x)));
        },
        reject: async (reason) => {
          await db.resolveReview(q.id, false, reason).catch(() => {});
          setReviewQueueNow((prev) => prev.map((x) => (x.id === q.id ? { ...x, status: 'rejected', reason } : x)));
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
