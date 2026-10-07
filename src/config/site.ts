// The public website. The iOS app needs it to recognise links to the site
// (they open in the app) and Stripe sends app users back through its /return page.
export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://maillot-two.vercel.app').replace(/\/$/, '');

/** Base for links people share or scan: this site in a browser, the public website inside the app. */
export function shareOrigin(): string {
  if (typeof window === 'undefined') return SITE_URL;
  return /^https?:$/.test(window.location.protocol) ? window.location.origin : SITE_URL;
}
