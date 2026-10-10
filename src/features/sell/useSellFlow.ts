// State for the four-step listing flow. Coming from a product page
// (/sell?shirt=…&size=…) skips identification because the shirt is known.
import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import type { Shirt } from '../../data.ts';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import { usePrefs } from '../../lib/prefs.tsx';
import * as db from '../../utils/db.ts';
import { analyzeAndCompress, type CompressedPhoto } from '../../utils/image.ts';
import type { ListingPhoto } from '../../types/domain.ts';
import { confidentMatch, sellPrefill } from '../identify/prefill.ts';
import { getShirt, resolveSize } from '../catalog/model.ts';

/** [condition value, description message key] */
export const CONDITIONS: [string, string][] = [
  ['New with tags', 'sell.cond.New with tags'],
  ['Excellent', 'sell.cond.Excellent'],
  ['Very good', 'sell.cond.Very good'],
  ['Good', 'sell.cond.Good']
];
export const EDITIONS = ['Replica', 'Authentic', 'Player issue', 'Match-worn'];
/** Photos of the actual shirt: [kind, label key]. The front is required. */
export const LISTING_PHOTOS = [
  ['front', 'sell.photo.front'],
  ['back', 'sell.photo.back'],
  ['label', 'sell.photo.label'],
  ['detail', 'sell.photo.detail']
] as const;

export type Scan = { status: 'idle' } | { status: 'reading'; img: string | null } | { status: 'done'; img: string; matchId: string | null; confidence: number; message: string };

export function useSellFlow() {
  const [params] = useSearchParams();
  const preset = getShirt(params.get('shirt') || undefined);
  const { user } = useSession();
  const toast = useToast();
  const { t, lang } = usePrefs();
  const qc = useQueryClient();

  const [step, setStep] = useState(preset ? 1 : 0);
  const [shirt, setShirt] = useState<Shirt | undefined>(preset);
  const [size, setSize] = useState(preset ? resolveSize(preset, params.get('size')) : 'M');
  const [condition, setCondition] = useState('Very good');
  const [edition, setEdition] = useState('Replica');
  const [player, setPlayer] = useState('');
  const [ask, setAsk] = useState('');
  const [scan, setScan] = useState<Scan>({ status: 'idle' });
  const [busy, setBusy] = useState(false);
  const [photos, setPhotos] = useState<Record<string, CompressedPhoto>>({});
  const [photoBusy, setPhotoBusy] = useState<string | null>(null);
  const [published, setPublished] = useState<{ sold: boolean; amount: number } | null>(null);
  const scanToken = useRef(0);

  const pick = (s: Shirt) => {
    setShirt(s);
    setSize(resolveSize(s, size));
    setAsk('');
    setStep(1);
    window.scrollTo(0, 0);
  };

  const scanLabel = async (file: File) => {
    const token = ++scanToken.current;
    setScan({ status: 'reading', img: null });
    try {
      const photo = await analyzeAndCompress(file, { maxDim: 1400 });
      if (scanToken.current !== token) return;
      setScan({ status: 'reading', img: photo.dataUrl });
      // The label photo also goes on the listing — buyers like to see it.
      setPhotos((x) => (x.label ? x : { ...x, label: photo }));
      if (!user) {
        setScan({ status: 'done', img: photo.dataUrl, matchId: null, confidence: 0, message: 'sell.scanSignIn' });
        return;
      }
      const r = await db.identifyShirt([{ kind: 'label', dataUrl: photo.dataUrl }], lang);
      if (scanToken.current !== token) return;
      if (!r.ok) {
        setScan({ status: 'done', img: photo.dataUrl, matchId: null, confidence: 0, message: r.reason === 'off' ? 'sell.scanOff' : r.reason === 'rate_limited' ? 'as.scan.limited' : 'sell.scanFailed' });
        return;
      }
      const match = confidentMatch(r.result);
      // Suggest what the photo shows; the member can change it in the next step.
      const pre = sellPrefill(r.result);
      if (pre.condition) setCondition(pre.condition);
      if (pre.edition) setEdition(pre.edition);
      if (pre.player) setPlayer(pre.player);
      setScan({
        status: 'done',
        img: photo.dataUrl,
        matchId: match,
        confidence: r.result.confidence,
        message: match ? '' : r.result.isShirt ? 'sell.scanUnsure' : 'sell.scanNoText'
      });
    } catch {
      if (scanToken.current === token) setScan({ status: 'idle' });
      toast(t('sell.scanFailed'));
    }
  };

  const addPhoto = async (kind: string, file: File) => {
    setPhotoBusy(kind);
    try {
      const photo = await analyzeAndCompress(file, { maxDim: 1600 });
      setPhotos((x) => ({ ...x, [kind]: photo }));
    } catch {
      toast(t('sell.photoFailed'));
    } finally {
      setPhotoBusy(null);
    }
  };

  const amount = parseInt(ask, 10) || 0;
  const publish = async () => {
    if (!user || !shirt || amount <= 0 || busy) return;
    setBusy(true);
    try {
      // Photos go up only now, so an abandoned listing leaves nothing behind.
      const folder = 'asks/' + Date.now().toString(36);
      const uploaded: ListingPhoto[] = [];
      for (const [kind] of LISTING_PHOTOS) {
        const p = photos[kind];
        if (!p) continue;
        const { path, thumbPath } = await db.uploadPhoto(user.id, folder, kind, p.blob, p.thumb);
        uploaded.push({ kind, path, thumbPath });
      }
      const placed = await db.placeAsk(user.id, { shirtId: shirt.id, size, amount, condition, edition, playerPrint: player.trim(), photos: uploaded });
      const order = await db.findOrderForAsk(placed.id);
      setPublished({ sold: !!order, amount: order ? Number(order.amount) : amount });
      qc.invalidateQueries({ queryKey: ['orderBook', shirt.id] });
      qc.invalidateQueries({ queryKey: ['shirtStats', shirt.id] });
      window.scrollTo(0, 0);
    } catch {
      toast(t('toast.actionFailed'));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    scanToken.current++;
    setStep(0);
    setShirt(undefined);
    setScan({ status: 'idle' });
    setAsk('');
    setPlayer('');
    setPhotos({});
    setPublished(null);
    window.scrollTo(0, 0);
  };

  const go = (n: number) => {
    setStep(n);
    window.scrollTo(0, 0);
  };

  return { step, go, shirt, pick, size, setSize, condition, setCondition, edition, setEdition, player, setPlayer, ask, setAsk, amount, scan, scanLabel, photos, photoBusy, addPhoto, busy, publish, published, reset, signedIn: !!user };
}

export type SellFlow = ReturnType<typeof useSellFlow>;
