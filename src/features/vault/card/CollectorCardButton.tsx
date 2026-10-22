// "Sammlerkarte": one of my shirts as a shiny trading card — in the app with
// a holographic shine (tap to turn it: front and back), as a picture to send
// (WhatsApp …) with the link to the shirt on Maillot, and (on Apple devices,
// once the pass service is set up) as a card in Apple Wallet.
import { useEffect, useState, type CSSProperties } from 'react';
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
import { renderShareCard } from './collectorShare.ts';
import { shareCard } from '../shareCard.ts';
import { SITE_URL } from '../../../config/site.ts';

const PASS_URL = (import.meta.env.VITE_SUPABASE_URL ?? '') + '/functions/v1/wallet-pass';
const onApple = () => typeof navigator !== 'undefined' && (isNative() || /iPhone|iPad|Macintosh/.test(navigator.userAgent));

export function CollectorCardButton({ item, card, print, style }: { item: CustomItem; card: Omit<HoloCardData, 'handle'>; print: string | null; style?: CSSProperties }) {
  const { t } = usePrefs();
  const { profile } = useSession();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [colors, setColors] = useState<[string, string]>(['#1b3a2a', '#0b0c0b']);
  const [busy, setBusy] = useState(false);
  const [turned, setTurned] = useState(false);
  // The picture to send is made as soon as the card is open, so the share sheet opens right on the tap.
  const [picture, setPicture] = useState<Blob | null>(null);
  const handle = profile?.handle ?? null;
  // The link opens the shirt on the owner's profile — only when others can see it.
  const visible = item.visibility !== 'private' && !!handle;
  const link = visible ? `${SITE_URL}/u/${encodeURIComponent(handle!)}/${encodeURIComponent(item.id)}` : SITE_URL;
  const frontLabel = t('card.front');
  const backLabel = t('card.back');
  useEffect(() => {
    if (!open) return;
    let live = true;
    renderShareCard({ front: card.image, frontCutout: card.cutout, back: card.back, colors, title: card.title, subtitle: card.subtitle, print, handle, link, labels: { front: frontLabel, back: backLabel } })
      .then((b) => live && setPicture(b))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [open, card.image, card.cutout, card.back, card.title, card.subtitle, print, handle, link, colors, frontLabel, backLabel]);

  const share = async () => {
    if (!picture) return;
    const text = t('card.shareText', { name: card.title }) + '\n' + link;
    try {
      const how = await shareCard(picture, text, 'maillot-card.jpg');
      if (how === 'downloaded') {
        await navigator.clipboard?.writeText(link).catch(() => {});
        toast(t('card.saved'));
      }
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') toast(t('card.shareFailed'));
    }
  };
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
            <div onClick={() => card.back && setTurned((v) => !v)} style={{ cursor: card.back ? 'pointer' : undefined }}>
              <HoloCard card={{ ...card, handle }} onColors={setColors} turned={turned} />
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)', textAlign: 'center' }}>{card.back ? t('card.hintTurn') : t('card.hint')}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {card.back && (
                <Button variant="secondary" size="sm" onClick={() => setTurned((v) => !v)}>
                  ↻ {turned ? t('card.showFront') : t('card.showBack')}
                </Button>
              )}
              <Button size="sm" onClick={share} disabled={!picture} aria-busy={!picture}>
                {t('card.share')}
              </Button>
            </div>
            {!visible && <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>{t('card.privateLink')}</p>}
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
