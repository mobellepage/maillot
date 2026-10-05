import { useEffect } from 'react';
import { usePrefs } from './prefs.tsx';

const SITE = 'MAILLOT';

/** Per-page <title> and meta description (also used by link previews), in the visitor's language. */
export function usePageMeta(title: string | null, description?: string) {
  const { t } = usePrefs();
  const fullTitle = title ? title + ' · ' + SITE : t('meta.defaultTitle');
  const desc = description ?? t('meta.defaultDesc');
  useEffect(() => {
    document.title = fullTitle;
    document.querySelector('meta[name="description"]')?.setAttribute('content', desc);
  }, [fullTitle, desc]);
}
