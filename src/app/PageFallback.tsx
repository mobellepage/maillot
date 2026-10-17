import { usePrefs } from '../lib/prefs.tsx';
import { Skeleton } from '../ui/index.ts';

/** Shown while a lazily-loaded page's code arrives. Not a <main id="main">:
 *  React can briefly keep a hidden fallback next to the next one, and there
 *  must only ever be one page landmark (the skip link and tests target it). */
export function PageFallback() {
  const { t } = usePrefs();
  return (
    <div className="page" role="status" aria-busy="true" aria-label={t('common.loadingPage')}>
      <Skeleton width={120} height={12} />
      <Skeleton width="min(520px, 80%)" height={48} style={{ marginTop: 14 }} />
      <div className="grid-cards" style={{ marginTop: 32 }}>
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} height={240} radius={20} />
        ))}
      </div>
    </div>
  );
}
