import { useEffect } from 'react';

const SITE = 'MAILLOT';
const DEFAULT_DESCRIPTION = 'The catalogue, marketplace and price index for football shirts. Every sale authenticated in Zürich.';

/** Per-page <title> and meta description (also used by link previews). */
export function usePageMeta(title: string | null, description: string = DEFAULT_DESCRIPTION) {
  useEffect(() => {
    document.title = title ? title + ' · ' + SITE : SITE + ' — the market for football shirts';
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  }, [title, description]);
}
