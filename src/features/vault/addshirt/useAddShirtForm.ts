// Local state for the "add a shirt" wizard. Short-lived and complex, so it
// stays out of server state; only the finished item is saved. The draft
// (minus photos) survives reloads in localStorage.
import { useCallback, useEffect, useRef, useState } from 'react';
import { SIZE_GROUPS } from '../../../addShirtData.js';
import { BY } from '../../../data.ts';
import { checkAuthenticity, enqueueReview, findReview, identifyShirt, removePhotos, signPhotoUrls, type AuthCheck, type CheckKind, type Identification } from '../../../utils/db.ts';
import { loadJSON, saveJSON } from '../../../utils/storage.ts';
import { useLive } from '../../../lib/realtime.ts';
import { precheck, withAiCheck } from './precheck.ts';
import { wizardPatch } from '../../identify/prefill.ts';
import type { Condition, Flock, Photo, Precheck, Review, Signature, Verification, Visibility } from '../../../types/domain.ts';
export { precheck } from './precheck.ts';

const DRAFT_KEY = 'kv_add_shirt_draft_v1';

/** Required photo slot → what the AI pre-check calls it. */
const CHECK_PHOTOS: [string, CheckKind][] = [
  ['front', 'front'],
  ['back', 'back'],
  ['crest', 'crest'],
  ['flock_closeup', 'flock'],
  ['product_code', 'label']
];

export interface ScanState {
  /** off: recognition isn't switched on; limited: too many tries this hour. */
  status: 'idle' | 'scanning' | 'done' | 'error' | 'off' | 'limited';
  confidence: number;
  matchId: string | null;
  result: Identification | null;
}

export interface AddShirtForm {
  step: number;
  /** Storage folder for this draft's photos. */
  draftId: string;
  scan: ScanState;
  catalogId: string | null;
  proposed: boolean;
  proposedClub: string;
  proposedSeason: string;
  proposedVariant: string;
  /** The kit of the library chosen in the search, if any. */
  kitId: string | null;
  searchQ: string;
  version: string;
  sizeGroup: string;
  size: string;
  sleeve: string;
  flock: Required<Flock>;
  patches: string[];
  signature: Required<Signature>;
  tagsAttached: boolean;
  condition: Condition;
  provenance: string;
  photos: Record<string, Photo>;
  precheck: Precheck | null;
  verification: Verification;
  /** null = the member's default: public, or private when their whole collection is private. */
  visibility: Visibility | null;
  salePrice: string;
  /** The member turned the studio look off for this shirt. */
  studioOff: boolean;
}

function emptyForm(): AddShirtForm {
  return {
    step: 0,
    draftId: 'draft-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    scan: { status: 'idle', confidence: 0, matchId: null, result: null },
    catalogId: null,
    proposed: false,
    proposedClub: '',
    proposedSeason: '',
    proposedVariant: '',
    kitId: null,
    searchQ: '',
    version: '',
    sizeGroup: 'Herren',
    size: 'M',
    sleeve: 'Kurzarm',
    flock: { source: 'Keine', name: '', number: '', type: 'Original (vom Verein)' },
    patches: [],
    signature: { signed: false, by: '', hasCoa: false, issuer: '' },
    tagsAttached: false,
    condition: { grade: 8, defects: [] },
    provenance: '',
    photos: {},
    precheck: null,
    verification: { level: 'self', status: 'none', reason: '', reviewId: null },
    visibility: null,
    salePrice: '',
    studioOff: false
  };
}

/** What a new shirt is saved as: the member's choice, else public — private when the collection is private. */
export function chosenVisibility(f: Pick<AddShirtForm, 'visibility'>, collectionPrivate: boolean | undefined): Visibility {
  return f.visibility ?? (collectionPrivate ? 'private' : 'public');
}

/**
 * A photo as a data URL for recognition: the one in memory, or — for a draft
 * resumed later, which keeps only the storage path — fetched back from storage.
 */
async function photoDataUrl(p: Photo | undefined): Promise<string | null> {
  if (!p) return null;
  if (p.dataUrl) return p.dataUrl;
  if (!p.path) return null;
  try {
    const url = (await signPhotoUrls([p.path]))[p.path];
    if (!url) return null;
    const blob = await (await fetch(url)).blob();
    return await new Promise<string>((ok, fail) => {
      const r = new FileReader();
      r.onload = () => ok(String(r.result));
      r.onerror = () => fail(r.error);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function useAddShirtForm(userId: string | undefined) {
  const [f, setRaw] = useState<AddShirtForm>(() => {
    const draft = loadJSON<Partial<AddShirtForm> | null>(DRAFT_KEY, null);
    // Uploaded photos persist as storage paths; the recognition result doesn't,
    // so a resumed draft rewinds to the scan step.
    return draft ? { ...emptyForm(), ...draft, precheck: null, scan: emptyForm().scan, step: 0 } : emptyForm();
  });
  const scanToken = useRef(0);
  const checkToken = useRef(0);
  // The latest photos, for a scan started from an older render.
  const photosRef = useRef(f.photos);
  useEffect(() => {
    photosRef.current = f.photos;
  }, [f.photos]);
  /** The AI pre-check is running, or why it couldn't (the local check still ran). */
  const [check, setCheck] = useState<{ busy: boolean; skipped: 'off' | 'rate_limited' | 'failed' | null }>({ busy: false, skipped: null });
  const set = (patch: Partial<AddShirtForm> | ((s: AddShirtForm) => Partial<AddShirtForm>)) => setRaw((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));

  useEffect(() => {
    // eslint-disable-next-line no-unused-vars
    const { photos, precheck: _p, scan, ...draft } = f;
    // Keep only storage paths for photos, never image bytes.
    const kept = Object.fromEntries(Object.entries(photos).filter(([, p]) => p.path).map(([k, p]) => [k, { ...p, dataUrl: undefined }]));
    saveJSON(DRAFT_KEY, { ...draft, photos: kept });
  }, [f]);

  // While a review is pending, apply the expert's decision as soon as the
  // review_queue row changes (realtime), plus once on mount for a resumed draft.
  const reviewId = f.verification.reviewId;
  const waiting = f.verification.status === 'angefragt' || f.verification.status === 'in Prüfung';
  const applyReview = useCallback(
    (entry: Review | null) => {
      if (!entry || !reviewId) return;
      setRaw((s) => {
        if (s.verification.reviewId !== reviewId) return s;
        if (entry.status === 'approved') return { ...s, verification: { level: 'expert', status: 'verifiziert', reason: '', reviewId } };
        if (entry.status === 'rejected') return { ...s, verification: { ...s.verification, status: 'abgelehnt', reason: entry.reason || 'as.v.defaultReason' } };
        if (entry.status === 'in_review' && s.verification.status !== 'in Prüfung') return { ...s, verification: { ...s.verification, status: 'in Prüfung' } };
        return s;
      });
    },
    [reviewId]
  );
  const syncReview = useCallback(() => {
    if (reviewId) findReview(reviewId).then(applyReview, () => {});
  }, [reviewId, applyReview]);
  useEffect(() => {
    if (!waiting || !reviewId) return;
    let live = true;
    findReview(reviewId).then((e) => live && applyReview(e), () => {});
    return () => {
      live = false;
    };
  }, [waiting, reviewId, applyReview]);
  useLive([{ table: 'review_queue', filter: 'id=eq.' + reviewId }], [], waiting && !!reviewId, syncReview);

  return {
    f,
    set,
    setPhoto: (key: string, data: Photo) => set((s) => ({ photos: { ...s.photos, [key]: data } })),
    removePhoto: (key: string) =>
      set((s) => {
        const p = { ...s.photos };
        delete p[key];
        return { photos: p };
      }),
    togglePatch: (p: string) => set((s) => ({ patches: s.patches.includes(p) ? s.patches.filter((x) => x !== p) : [...s.patches, p] })),
    /**
     * Stores the front or back photo and recognises the shirt from every photo
     * taken so far (front and back together: crest, sponsor, name and number). The result
     * prefills the wizard without overriding what the member already chose.
     */
    runScan: async (key: 'front' | 'back', photo: Photo & { dataUrl: string }, lang: string, kitLabel: (kit: string) => string) => {
      const token = ++scanToken.current;
      // Every photo taken so far, from the latest state (not this render's): front and back together.
      const photos = { ...photosRef.current, [key]: photo };
      set((s) => ({ photos: { ...s.photos, [key]: photo }, scan: { ...s.scan, status: 'scanning' } }));
      try {
        const images = (
          await Promise.all(
            ([['front', 'front'], ['back', 'back'], ['product_code', 'label']] as const).map(async ([k, kind]) => {
              const dataUrl = await photoDataUrl(photos[k]);
              return dataUrl ? { kind, dataUrl } : null;
            })
          )
        ).filter((x): x is { kind: 'front' | 'back' | 'label'; dataUrl: string } => !!x);
        const r = await identifyShirt(images, lang);
        if (scanToken.current !== token) return;
        if (!r.ok) {
          set((s) => ({ scan: { ...s.scan, status: r.reason === 'off' ? 'off' : r.reason === 'rate_limited' ? 'limited' : 'error' } }));
          return;
        }
        set((s) => {
          // A more certain earlier answer stays; what only the new photo shows (name, number, size, code) is added to it.
          const prev = s.scan.result;
          const keep = prev && prev.isShirt && (prev.libraryKit || prev.catalogId) && !(r.result.libraryKit || r.result.catalogId) && prev.confidence > r.result.confidence;
          const result = keep ? { ...prev, labelSize: r.result.labelSize ?? prev.labelSize, productCode: r.result.productCode ?? prev.productCode } : r.result;
          return {
            ...wizardPatch(result, s, kitLabel, (g) => SIZE_GROUPS[g as keyof typeof SIZE_GROUPS] ?? []),
            scan: { status: 'done', confidence: result.confidence, matchId: result.catalogId, result }
          };
        });
      } catch {
        if (scanToken.current === token) set((s) => ({ scan: { ...s.scan, status: 'error' } }));
      }
    },
    check,
    /** Local checks plus, when switched on, the AI pre-check of the required photos. */
    runPrecheck: async (lang: string) => {
      const token = ++checkToken.current;
      setCheck({ busy: true, skipped: null });
      const photos = CHECK_PHOTOS.flatMap(([key, kind]) => (f.photos[key]?.path ? [{ kind, path: f.photos[key]!.path! }] : []));
      const name = f.catalogId ? BY[f.catalogId]?.name ?? null : [f.proposedClub, f.proposedSeason, f.proposedVariant].filter(Boolean).join(' ') || null;
      const claim = {
        shirt: name,
        version: f.version || null,
        print: f.flock.source !== 'Keine' ? [f.flock.name, f.flock.number].filter(Boolean).join(' ') || null : null,
        patches: f.patches
      };
      let ai: AuthCheck | null = null;
      let skipped: 'off' | 'rate_limited' | 'failed' | null = null;
      try {
        const r = await checkAuthenticity(photos, claim, lang);
        if (r.ok) ai = r.result;
        else skipped = r.reason;
      } catch {
        skipped = 'failed';
      }
      if (checkToken.current !== token) return;
      setCheck({ busy: false, skipped });
      set((s) => {
        const p = withAiCheck(precheck(s), ai);
        const level = p.status === 'ok' ? (s.verification.level === 'expert' ? 'expert' : 'precheck') : s.verification.level;
        return { precheck: p, verification: { ...s.verification, level } };
      });
    },
    requestVerification: () => {
      if (!userId) return;
      set((s) => ({ verification: { ...s.verification, status: 'angefragt' } }));
      enqueueReview(userId, null, {
        catalogId: f.catalogId,
        proposedName: [f.proposedClub, f.proposedSeason, f.proposedVariant].filter(Boolean).join(' '),
        version: f.version,
        sizeGroup: f.sizeGroup,
        size: f.size,
        sleeve: f.sleeve,
        flock: f.flock,
        patches: f.patches,
        signature: f.signature,
        tagsAttached: f.tagsAttached,
        condition: f.condition,
        provenance: f.provenance,
        photos: f.photos,
        precheck: f.precheck
      })
        .then((id) => set((s) => ({ verification: { ...s.verification, reviewId: id } })))
        .catch(() => set((s) => ({ verification: { ...s.verification, status: 'none' } })));
    },
    /** Clears the draft. Pass discard=true to also delete its uploaded photos. */
    reset: (discard = false) => {
      if (discard) {
        const paths = Object.values(f.photos).flatMap((p) => [p.path, p.thumbPath]).filter((x): x is string => !!x);
        removePhotos(paths).catch(() => {});
      }
      saveJSON(DRAFT_KEY, null);
      setRaw(emptyForm());
    }
  };
}

export type Wizard = ReturnType<typeof useAddShirtForm>;
