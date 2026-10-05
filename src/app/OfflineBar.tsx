import { useSyncExternalStore } from 'react';
import { usePrefs } from '../lib/prefs.tsx';

const subscribe = (cb: () => void) => {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
};

/** A thin bar while the browser is offline; prices and orders can't update. */
export function OfflineBar() {
  const { t } = usePrefs();
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div className="offline-bar" role="status">
      {t('error.offlineBar')}
    </div>
  );
}
