// Tiny path router for the single-state app shell. The engine stays the
// source of truth (state.view + a few ids); this module only translates
// that state to/from a real URL so every page is linkable, shareable,
// bookmarkable, indexable and works with the browser back button.
//
//   /                     home
//   /market               browse
//   /shirt/:id            detail
//   /sell                 sell
//   /vault                profile · collection
//   /watchlist            profile · watchlist
//   /orders               profile · orders
//   /vault/add            add a shirt
//   /vault/item/:id       custom vault item
//   /admin                admin
//   /signin               auth
//   /authentication       how authentication works
//
// Public share links keep their self-contained hash form (#/vault/<data>),
// handled separately by utils/share.js.
import { BY } from '../data.ts';

export interface RouteState {
  view: string;
  id?: string;
  pTab?: string;
  vaultItemId?: string | null;
}

const PROFILE_TABS: Record<string, string> = { collection: '/vault', watchlist: '/watchlist', orders: '/orders' };

export function pathFor(st: RouteState): string | null {
  switch (st.view) {
    case 'home':
      return '/';
    case 'browse':
      return '/market';
    case 'detail':
      return '/shirt/' + encodeURIComponent(st.id || '');
    case 'sell':
      return '/sell';
    case 'profile':
      return (st.pTab && PROFILE_TABS[st.pTab]) || '/vault';
    case 'addshirt':
      return '/vault/add';
    case 'vaultitem':
      return st.vaultItemId ? '/vault/item/' + encodeURIComponent(st.vaultItemId) : '/vault';
    case 'admin':
      return '/admin';
    case 'auth':
      return '/signin';
    case 'authinfo':
      return '/authentication';
    default:
      return null; // publicvault etc. — leave the URL alone
  }
}

export function stateFromPath(pathname: string): RouteState {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [a, b, c] = parts;
  if (!a) return { view: 'home' };
  if (a === 'market') return { view: 'browse' };
  if (a === 'shirt' && b && BY[b]) return { view: 'detail', id: b };
  if (a === 'sell') return { view: 'sell' };
  if (a === 'watchlist') return { view: 'profile', pTab: 'watchlist' };
  if (a === 'orders') return { view: 'profile', pTab: 'orders' };
  if (a === 'vault' && b === 'add') return { view: 'addshirt' };
  if (a === 'vault' && b === 'item' && c) return { view: 'vaultitem', vaultItemId: c };
  if (a === 'vault') return { view: 'profile', pTab: 'collection' };
  if (a === 'admin') return { view: 'admin' };
  if (a === 'signin') return { view: 'auth' };
  if (a === 'authentication') return { view: 'authinfo' };
  return { view: 'home' };
}

// Views that only make sense for a signed-in user.
export const PRIVATE_VIEWS: ReadonlySet<string> = new Set(['profile', 'addshirt', 'vaultitem', 'admin']);

const SITE = 'MAILLOT';
export function titleFor(st: RouteState): string {
  switch (st.view) {
    case 'detail': {
      const s = st.id ? BY[st.id] : undefined;
      return s ? s.name + ' — price, bids & sales · ' + SITE : SITE;
    }
    case 'browse':
      return 'Marketplace · ' + SITE;
    case 'sell':
      return 'Sell a football shirt · ' + SITE;
    case 'profile':
      return (st.pTab === 'orders' ? 'Orders' : st.pTab === 'watchlist' ? 'Watchlist' : 'My collection') + ' · ' + SITE;
    case 'addshirt':
      return 'Add a shirt · ' + SITE;
    case 'admin':
      return 'Admin · ' + SITE;
    case 'auth':
      return 'Sign in · ' + SITE;
    case 'authinfo':
      return 'How authentication works · ' + SITE;
    default:
      return SITE + ' — the market for football shirts';
  }
}

export function descriptionFor(st: RouteState): string {
  if (st.view === 'detail' && st.id) {
    const s = BY[st.id];
    if (s) return 'Live bids, asks and price history for the ' + s.name + ' (' + s.brand + '). Every sale authenticated in Zürich.';
  }
  if (st.view === 'authinfo') return 'How Maillot authenticates every football shirt: escrowed payment, a 14-point inspection in Zürich and a full-refund guarantee.';
  return 'The catalogue, marketplace and price index for football shirts. Every sale authenticated in Zürich.';
}
