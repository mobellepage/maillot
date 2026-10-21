// The public website. The iOS app needs it to recognise links to the site
// (they open in the app) and Stripe sends app users back through its /return page.
export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://maillot.app').replace(/\/$/, '');

/** Base for links people share or scan: this site in a browser, the public website inside the app. */
export function shareOrigin(): string {
  if (typeof window === 'undefined') return SITE_URL;
  return /^https?:$/.test(window.location.protocol) ? window.location.origin : SITE_URL;
}

/** Prototype phase: a notice across the top says pictures and figures are examples. Turn off before launch. */
export const PROTOTYPE = true;

/**
 * Store links for the badges (app/StoreBadges.tsx). Set them in Vercel
 * (VITE_APP_STORE_URL / VITE_GOOGLE_PLAY_URL) — or here — once the apps are
 * live; until then each badge says "coming soon" and links nowhere.
 */
export const STORE_LINKS: { appStore: string | null; googlePlay: string | null } = {
  appStore: import.meta.env.VITE_APP_STORE_URL || null,
  googlePlay: import.meta.env.VITE_GOOGLE_PLAY_URL || null
};

/**
 * Social sign-in shown on the sign-in page, e.g. VITE_AUTH_PROVIDERS="apple,google".
 * Only list providers that are switched on in Supabase (Authentication →
 * Sign In / Providers); empty = email and password only. Instagram can't be
 * offered: Meta has no sign-in for personal Instagram accounts.
 */
export const AUTH_PROVIDERS = String(import.meta.env.VITE_AUTH_PROVIDERS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter((s): s is 'apple' | 'google' => s === 'apple' || s === 'google');

/**
 * The Pinterest board shown under Feed → Fits (blokecore outfits), e.g.
 * "https://www.pinterest.com/<user>/<board>/". Empty = the Fits tab is hidden.
 * Shown with Pinterest's own board widget, loaded only after a tap
 * (features/feed/PinterestBoard.tsx).
 */
export const PINTEREST_BOARD: string = import.meta.env.VITE_PINTEREST_BOARD || 'https://www.pinterest.com/monazarm1/blokecore/';
