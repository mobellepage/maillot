// State for the quick listing ("list it quickly"): identify, details with the
// front and the back, price, review. The listing is a shirt in the seller's
// collection, for sale — on the marketplace, in the feed and on their profile
// at once — marked "self-reported" until the pre-check photos follow (the
// full path is /vault/add?goal=sale). Coming from a product page
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
import type { CustomItem, Photo, Valuation } from '../../types/domain.ts';
import { estimateValue } from '../../addShirtData.js';
import { BY } from '../../data.ts';
import { EXPERT_AUTH } from '../../config/rules.ts';
import { confidentMatch, sellPrefill } from '../identify/prefill.ts';
import { getShirt, resolveSize } from '../catalog/model.ts';

/** [condition value, description message key] */
export const CONDITIONS: [string, string][] = [
  ['New with tags', 'sell.cond.New with tags'],
  ['Excellent', 'sell.cond.Excellent'],
  ['Very good', 'sell.cond.Very good'],
  ['Good', 'sell.cond.Good']
];
// The four versions (config/rules.ts VERSIONS); the valuation reads them too (private.edition_factor).
export const EDITIONS = ['Replica', 'Player-Issue', 'Match-Issued', 'Match-Worn'];
/** Photos of the actual shirt: [kind, label key, where it goes on the shirt]. Front and back are required. */
export const LISTING_PHOTOS = [
  ['front', 'sell.photo.front', 'front'],
  ['back', 'sell.photo.back', 'back'],
  ['label', 'sell.photo.label', 'product_code'],
  ['detail', 'sell.photo.detail', 'detail']
] as const;

/** The quick listing's words for condition and version → the collection's. */
const GRADE: Record<string, number> = { 'New with tags': 10, Excellent: 9, 'Very good': 8, Good: 6 };
const VERSION: Record<string, string> = { Replica: 'Fan-Replica', 'Player-Issue': 'Player-Issue / Authentic', 'Match-Issued': 'Match-Issued', 'Match-Worn': 'Match-Worn' };

/** A printed name and number ("Del Piero 10") as the collection's print. */
export function flockFrom(player: string) {
  const p = player.trim();
  if (!p) return { source: 'Keine' };
  const m = /^(.*?)\s*(\d{1,3})$/.exec(p);
  return { source: 'Spielername & Nummer', name: (m ? m[1]! : p).trim(), number: m ? m[2]! : '', type: 'Unbekannt' };
}

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
  const [published, setPublished] = useState<{ itemId: string; amount: number } | null>(null);
  /** Chosen on the first screen: the quick listing (here) or the full path (/vault/add?goal=sale). */
  const [path, setPath] = useState<'quick' | null>(null);
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
  // From the threshold, or a match version, selling needs expert authentication: the full path (config EXPERT_AUTH).
  const matchVersion = edition === 'Match-Issued' || edition === 'Match-Worn';
  const needsFullPath = matchVersion || amount >= EXPERT_AUTH.thresholdChf;
  const publish = async () => {
    if (!user || !shirt || amount <= 0 || busy || needsFullPath) return;
    setBusy(true);
    try {
      // Photos go up only now, so an abandoned listing leaves nothing behind.
      const id = 'custom-' + Date.now();
      const stored: Record<string, Photo> = {};
      for (const [kind, , key] of LISTING_PHOTOS) {
        const p = photos[kind];
        if (!p) continue;
        const { path, thumbPath } = await db.uploadPhoto(user.id, 'items/' + id, key, p.blob, p.thumb);
        stored[key] = { path, thumbPath, label: t('sell.photo.' + kind), width: p.width, height: p.height, lowRes: p.lowRes, blurry: p.blurry, tooDark: p.tooDark, tooBright: p.tooBright };
      }
      const flock = flockFrom(player);
      const version = VERSION[edition] ?? 'Fan-Replica';
      const grade = GRADE[condition] ?? 8;
      const valuation = estimateValue({ catalogItem: BY[shirt.id] ?? null, version, conditionGrade: grade, flock, patches: [], signature: { signed: false }, verificationLevel: 'self' }) as Valuation;
      const now = Date.now();
      const item: CustomItem = {
        id,
        catalogId: shirt.id,
        proposed: false,
        proposedClub: '',
        proposedSeason: '',
        proposedVariant: '',
        version,
        sizeGroup: 'Herren',
        size,
        sleeve: null,
        flock,
        patches: [],
        signature: { signed: false },
        tagsAttached: condition === 'New with tags',
        condition: { grade, defects: [] },
        provenance: '',
        photos: stored,
        precheck: null,
        verification: { level: 'self', status: 'none', reason: '', reviewId: null },
        visibility: 'forsale',
        salePrice: String(amount),
        valuation,
        initialValuation: valuation,
        createdAt: now,
        updatedAt: now
      };
      await db.upsertCustomItem(user.id, item);
      setPublished({ itemId: id, amount });
      qc.invalidateQueries({ queryKey: ['customItems', user.id] });
      qc.invalidateQueries({ queryKey: ['marketExemplars'] });
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
    setPath(null);
    window.scrollTo(0, 0);
  };

  const go = (n: number) => {
    setStep(n);
    window.scrollTo(0, 0);
  };

  return { needsFullPath, matchVersion, path, setPath, step, go, shirt, pick, size, setSize, condition, setCondition, edition, setEdition, player, setPlayer, ask, setAsk, amount, scan, scanLabel, photos, photoBusy, addPhoto, busy, publish, published, reset, signedIn: !!user };
}

export type SellFlow = ReturnType<typeof useSellFlow>;
