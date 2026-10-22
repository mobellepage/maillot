// "Sammlerkarte": one of my shirts as a shiny trading card — in the app with
// a holographic shine, and (on Apple devices, once the pass service is set
// up) as a card in Apple Wallet whose QR code opens the shirt's public page.
import { useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePrefs } from '../../../lib/prefs.tsx';
import { useSession } from '../../../lib/session.tsx';
import { useToast } from '../../../lib/toast.tsx';
import { isNative, openExternal } from '../../../lib/native.ts';
import * as db from '../../../utils/db.ts';
import type { CustomItem } from '../../../types/domain.ts';
import { Button, Dialog } from '../../../ui/index.ts';
import { HoloCard, type HoloCardData } from './HoloCard.tsx';
import { renderPassStrip } from './passStrip.ts';

const PASS_URL = (import.meta.env.VITE_SUPABASE_URL ?? '') + '/functions/v1/wallet-pass';
const onApple = () => typeof navigator !== 'undefined' && (isNative() || /iPhone|iPad|Macintosh/.test(navigator.userAgent));

export function CollectorCardButton({ item, card, style }: { item: CustomItem; card: Omit<HoloCardData, 'handle'>; style?: CSSProperties }) {
  const { t } = usePrefs();
  const { profile } = useSession();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [colors, setColors] = useState<[string, string]>(['#1b3a2a', '#0b0c0b']);
  const [busy, setBusy] = useState(false);
  const wallet = useQuery({
    queryKey: ['walletPassConfigured'],
    queryFn: async () => ((await (await fetch(PASS_URL + '?probe=1')).json()) as { configured?: boolean }).configured === true,
    enabled: open && onApple(),
    staleTime: Infinity,
    retry: false
  });

  const addToWallet = async () => {
    if (!card.image) return;
    setBusy(true);
    try {
      const strip = await renderPassStrip(card.image, colors, card.cutout);
      const res = await db.createCollectorPass(item.id, strip, colors[0]);
      if (!res.configured || !res.url) throw new Error('not configured');
      // Safari shows the pass with "Add" and stays on this page; the app hands it to Wallet via the in-app browser.
      if (isNative()) await openExternal(res.url);
      else window.location.href = res.url;
    } catch {
      toast(t('card.walletFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)} style={style}>
        ✦ {t('card.open')}
      </Button>
      {open && (
        <Dialog open onClose={() => setOpen(false)} title={t('card.title')} width={420}>
          <div style={{ display: 'grid', justifyItems: 'center', gap: 14 }}>
            <HoloCard card={{ ...card, handle: profile?.handle ?? null }} onColors={setColors} />
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)', textAlign: 'center' }}>{t('card.hint')}</p>
            {wallet.data && card.image && (
              <button type="button" className="wallet-btn" onClick={addToWallet} disabled={busy} aria-busy={busy}>
                <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <rect x="2.5" y="4.5" width="19" height="15" rx="3" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M2.5 9h19M2.5 12.5h19" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                {busy ? t('card.making') : t('ver.addToWallet')}
              </button>
            )}
          </div>
        </Dialog>
      )}
    </>
  );
}
