// Two notices for people using Maillot from the home screen.
// 1. A new version has been downloaded in the background (the service worker
//    took over): offer to reload now instead of waiting for the next launch.
// 2. iPhone home-screen apps keep the icon they were added with. Installs
//    made with the current manifest start at /?app=3; a launch without it is
//    an older install, so once we suggest adding Maillot again for the new icon.
import { useEffect, useState } from 'react';
import { usePrefs } from '../lib/prefs.tsx';
import { loadJSON, saveJSON } from '../utils/storage.ts';

const ICON_HINT_KEY = 'kv_icon_hint_v3';
// Read once at start: the app moves on to other URLs afterwards.
const launchedFromCurrentInstall = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('app') === '3';
const iosHomeScreen = typeof navigator !== 'undefined' && (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function AppUpdates() {
  const { t } = usePrefs();
  const [updated, setUpdated] = useState(false);
  const [iconHint, setIconHint] = useState(() => iosHomeScreen && !launchedFromCurrentInstall && !loadJSON<boolean>(ICON_HINT_KEY, false));

  useEffect(() => {
    const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined;
    if (!sw) return;
    // Only a replacement counts: the very first install also fires controllerchange.
    const hadController = !!sw.controller;
    const onChange = () => hadController && setUpdated(true);
    sw.addEventListener('controllerchange', onChange);
    // Look for a new version whenever the app comes back to the foreground.
    const check = () => document.visibilityState === 'visible' && sw.getRegistration().then((r) => r?.update()).catch(() => {});
    document.addEventListener('visibilitychange', check);
    return () => {
      sw.removeEventListener('controllerchange', onChange);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);

  if (updated)
    return (
      <div className="app-notice" role="status">
        <span>{t('app.updated')}</span>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => window.location.reload()}>
          {t('app.reload')}
        </button>
      </div>
    );
  if (iconHint)
    return (
      <div className="app-notice" role="status">
        <span>{t('app.iconHint')}</span>
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={() => {
            saveJSON(ICON_HINT_KEY, true);
            setIconHint(false);
          }}
        >
          {t('app.iconHintOk')}
        </button>
      </div>
    );
  return null;
}
