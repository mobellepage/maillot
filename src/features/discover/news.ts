// Kit news helpers shared by the cards and the news page.
import { isNative, openExternal } from '../../lib/native.ts';

/** Title pictures live in our public news-images bucket. */
export const newsPicture = (path: string) => (import.meta.env.VITE_SUPABASE_URL as string) + '/storage/v1/object/public/news-images/' + path;

/**
 * The full article: in the iOS app it opens in the in-app browser (a sheet
 * over Maillot); on the web in a new tab, so Maillot stays open.
 */
export function openArticle(url: string): void {
  if (isNative()) void openExternal(url);
  else window.open(url, '_blank', 'noopener,noreferrer');
}

/** "Okt. 2026" in the reader's language. */
export const newsMonth = (iso: string, lang: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString(lang === 'de' ? 'de-CH' : lang, { month: 'short', year: 'numeric' });
