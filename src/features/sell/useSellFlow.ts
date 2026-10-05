// State for the four-step listing flow. Coming from a product page
// (/sell?shirt=…&size=…) skips identification because the shirt is known.
import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { matchCatalogFromOcrText } from '../../addShirtData.js';
import type { Shirt } from '../../data.ts';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import { usePrefs } from '../../lib/prefs.tsx';
import * as db from '../../utils/db.ts';
import { analyzeAndCompress } from '../../utils/image.ts';
import { readLabelText } from '../../utils/ocr.ts';
import { getShirt, resolveSize } from '../catalog/model.ts';

/** [condition value, description message key] */
export const CONDITIONS: [string, string][] = [
  ['New with tags', 'sell.cond.New with tags'],
  ['Excellent', 'sell.cond.Excellent'],
  ['Very good', 'sell.cond.Very good'],
  ['Good', 'sell.cond.Good']
];
export const EDITIONS = ['Replica', 'Authentic', 'Player issue', 'Match-worn'];

export type Scan = { status: 'idle' } | { status: 'reading'; img: string | null } | { status: 'done'; img: string; matchId: string | null; confidence: number; message: string };

export function useSellFlow() {
  const [params] = useSearchParams();
  const preset = getShirt(params.get('shirt') || undefined);
  const { user } = useSession();
  const toast = useToast();
  const { t } = usePrefs();
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
      const text = await readLabelText(photo.dataUrl);
      if (scanToken.current !== token) return;
      const { item, confidence } = matchCatalogFromOcrText(text);
      const confident = !!item && confidence >= 0.34;
      setScan({
        status: 'done',
        img: photo.dataUrl,
        matchId: confident ? item!.id : null,
        confidence,
        message: confident ? '' : text ? 'sell.scanUnsure' : 'sell.scanNoText'
      });
    } catch {
      if (scanToken.current === token) setScan({ status: 'idle' });
      toast(t('sell.scanFailed'));
    }
  };

  const amount = parseInt(ask, 10) || 0;
  const publish = async () => {
    if (!user || !shirt || amount <= 0 || busy) return;
    setBusy(true);
    try {
      const placed = await db.placeAsk(user.id, { shirtId: shirt.id, size, amount, condition, edition, playerPrint: player.trim() });
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
    setPublished(null);
    window.scrollTo(0, 0);
  };

  const go = (n: number) => {
    setStep(n);
    window.scrollTo(0, 0);
  };

  return { step, go, shirt, pick, size, setSize, condition, setCondition, edition, setEdition, player, setPlayer, ask, setAsk, amount, scan, scanLabel, busy, publish, published, reset, signedIn: !!user };
}

export type SellFlow = ReturnType<typeof useSellFlow>;
