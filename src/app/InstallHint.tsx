// Until Maillot is on the App Store, the best way to use it on a phone is
// from the home screen (full screen, no browser bars). Five seconds into a
// visit, phone and tablet visitors get the steps once; closing it keeps it
// away for a week. Never inside the iOS app, from the home screen itself, or
// in automated browsers.
import { useEffect, useState, type ReactNode } from 'react';
import { usePrefs } from '../lib/prefs.tsx';
import { isNative } from '../lib/native.ts';
import { Dialog } from '../ui/Dialog.tsx';
import { loadJSON, saveJSON } from '../utils/storage.ts';

const KEY = 'kv_install_hint';
const DELAY_MS = 5000;
const SNOOZE_MS = 7 * 24 * 3600 * 1000;

function standalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** iPhone or iPad (iPadOS reports itself as a Mac with touch). */
function isApple(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function shouldShow(): boolean {
  if (typeof window === 'undefined' || isNative() || standalone() || navigator.webdriver) return false;
  if (!window.matchMedia?.('(pointer: coarse)').matches) return false;
  return Date.now() - loadJSON<number>(KEY, 0) > SNOOZE_MS;
}

export function InstallHint() {
  const { t } = usePrefs();
  const [open, setOpen] = useState(false);
  const [apple] = useState(() => typeof navigator !== 'undefined' && isApple());

  useEffect(() => {
    if (!shouldShow()) return;
    const id = window.setTimeout(() => setOpen(true), DELAY_MS);
    return () => window.clearTimeout(id);
  }, []);

  const close = () => {
    saveJSON(KEY, Date.now());
    setOpen(false);
  };

  const steps: [ReactNode, string][] = apple
    ? [
        [<DotsIcon key="d" />, t('install.ios.dots')],
        [<ShareIcon key="s" />, t('install.ios.share')],
        [<MoreIcon key="m" />, t('install.ios.more')],
        [<AddIcon key="a" />, t('install.ios.add')]
      ]
    : [
        [<DotsIcon key="d" vertical />, t('install.android.menu')],
        [<AddIcon key="a" />, t('install.android.add')]
      ];

  return (
    <Dialog open={open} onClose={close} title={t('install.title')} width={420}>
      <div className="install-hint">
        <div className="install-hint-app" aria-hidden="true">
          <img src="/apple-touch-icon.png?v=4" alt="" width={56} height={56} />
          <span>Maillot</span>
        </div>
        <p className="install-hint-lead">{t('install.lead')}</p>
        <ol className="install-hint-steps">
          {steps.map(([icon, text], i) => (
            <li key={i}>
              <span className="install-hint-num">{i + 1}</span>
              <span className="install-hint-icon" aria-hidden="true">
                {icon}
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ol>
        <button type="button" className="btn btn--primary btn--lg btn--block" onClick={close}>
          {t('install.ok')}
        </button>
      </div>
    </Dialog>
  );
}

const svg = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

function DotsIcon({ vertical = false }: { vertical?: boolean }) {
  return (
    <svg {...svg} fill="currentColor" stroke="none">
      {(vertical ? [[12, 5], [12, 12], [12, 19]] : [[5, 12], [12, 12], [19, 12]]).map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={2} />
      ))}
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg {...svg}>
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M7 10H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg {...svg}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function AddIcon() {
  return (
    <svg {...svg}>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M12 8.5v7M8.5 12h7" />
    </svg>
  );
}
