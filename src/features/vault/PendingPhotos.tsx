// A shirt listed from the library without photos of its own: the kit's
// library picture, marked "own photos still to come". In the member's own
// collection (nudge) it says "Add your own photos" instead — the card is
// greyed out until they do (.shirt-pending).
import { usePrefs } from '../../lib/prefs.tsx';

export function PendingPhotos({ src, compact = false, nudge = false }: { src: string; compact?: boolean; nudge?: boolean }) {
  const { t } = usePrefs();
  return (
    <>
      <img src={src} alt="" loading="lazy" decoding="async" style={{ width: compact ? '84%' : '74%', height: compact ? '84%' : '74%', objectFit: 'contain', opacity: nudge ? undefined : 0.92 }} />
      {!compact &&
        (nudge ? (
          <span className="badge badge--neutral pending-nudge">📷 {t('ownphotos.title')}</span>
        ) : (
          <span className="badge badge--neutral" style={{ position: 'absolute', left: 12, bottom: 12, zIndex: 3, fontSize: 10, pointerEvents: 'none', background: 'var(--overlay)' }}>
            📷 {t('vault.photosPending')}
          </span>
        ))}
    </>
  );
}
