// A Pinterest board with Pinterest's official widget (pinit.js). Nothing is
// loaded from Pinterest until the visitor taps "Show" — then Pinterest sees
// that visit (privacy policy); the choice is remembered on this device.
import { useEffect, useRef, useState } from 'react';
import { usePrefs } from '../../lib/prefs.tsx';
import { loadJSON, saveJSON } from '../../utils/storage.ts';
import { Button } from '../../ui/index.ts';

const OK_KEY = 'kv_pinterest_ok';
const SCRIPT = 'https://assets.pinterest.com/js/pinit.js';

type PinUtils = { build?: () => void };

function loadPinterest(): Promise<void> {
  const w = window as unknown as { PinUtils?: PinUtils };
  if (w.PinUtils?.build) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT;
    s.async = true;
    s.dataset.pinBuild = 'kvPinBuild';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('pinterest'));
    document.body.appendChild(s);
  });
}

export function PinterestBoard({ url }: { url: string }) {
  const { t } = usePrefs();
  const [ok, setOk] = useState(() => loadJSON<boolean>(OK_KEY, false));
  const [failed, setFailed] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!ok) return;
    setWidth(box.current?.clientWidth ?? 0);
    loadPinterest()
      .then(() => (window as unknown as { PinUtils?: PinUtils }).PinUtils?.build?.())
      .catch(() => setFailed(true));
  }, [ok]);

  if (!ok)
    return (
      <div className="card" style={{ padding: 24, borderRadius: 22, textAlign: 'center' }}>
        <p style={{ margin: '0 0 14px', color: 'var(--text-2)', lineHeight: 1.5 }}>{t('fits.consent')}</p>
        <Button
          onClick={() => {
            saveJSON(OK_KEY, true);
            setOk(true);
          }}
        >
          {t('fits.show')}
        </Button>
      </div>
    );
  return (
    <div ref={box} style={{ minHeight: 400 }}>
      {failed ? (
        <p style={{ color: 'var(--muted)' }}>
          {t('fits.failed')}{' '}
          <a href={url} target="_blank" rel="noopener noreferrer">
            {t('fits.open')}
          </a>
        </p>
      ) : (
        // Pinterest turns this link into the board (pins in columns).
        <a data-pin-do="embedBoard" data-pin-board-width={String(Math.max(300, width - 24))} data-pin-scale-height="1100" data-pin-scale-width="135" href={url}>
          {t('fits.open')}
        </a>
      )}
    </div>
  );
}
