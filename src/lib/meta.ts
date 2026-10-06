import { useEffect } from 'react';
import { usePrefs } from './prefs.tsx';

const SITE = 'MAILLOT';

/** What the page asked for during a server render (read by scripts/prerender.mjs). */
export const ssrHead = { title: '', description: '' };

/** Server render only: effects don't run there, so record the head directly. */
function recordSsrHead(title: string, description: string) {
  ssrHead.title = title;
  ssrHead.description = description;
}

/** Per-page <title> and meta description (also used by link previews), in the visitor's language. */
export function usePageMeta(title: string | null, description?: string) {
  const { t } = usePrefs();
  const fullTitle = title ? title + ' · ' + SITE : t('meta.defaultTitle');
  const desc = description ?? t('meta.defaultDesc');
  if (typeof document === 'undefined') recordSsrHead(fullTitle, desc);
  useEffect(() => {
    document.title = fullTitle;
    document.querySelector('meta[name="description"]')?.setAttribute('content', desc);
  }, [fullTitle, desc]);
}
