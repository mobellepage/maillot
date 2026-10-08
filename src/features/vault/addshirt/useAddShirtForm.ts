// Local state for the "add a shirt" wizard. Short-lived and complex, so it
// stays out of server state; only the finished item is saved. The draft
// (minus photos) survives reloads in localStorage.
import { useCallback, useEffect, useRef, useState } from 'react';
import { SIZE_GROUPS } from '../../../addShirtData.js';
import { enqueueReview, findReview, identifyShirt, removePhotos, type Identification } from '../../../utils/db.ts';
import { loadJSON, saveJSON } from '../../../utils/storage.ts';
import { useLive } from '../../../lib/realtime.ts';
import { precheck } from './precheck.ts';
import { wizardPatch } from '../../identify/prefill.ts';
import type { Condition, Flock, Photo, Precheck, Review, Signature, Verification, Visibility } from '../../../types/domain.ts';
export { precheck } from './precheck.ts';

const DRAFT_KEY = 'kv_add_shirt_draft_v1';

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
  visibility: Visibility;
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
    visibility: 'private',
    salePrice: '',
    studioOff: false
  };
}

export function useAddShirtForm(userId: string | undefined) {
  const [f, setRaw] = useState<AddShirtForm>(() => {
    const draft = loadJSON<Partial<AddShirtForm> | null>(DRAFT_KEY, null);
    // Uploaded photos persist as storage paths; the recognition result doesn't,
    // so a resumed draft rewinds to the scan step.
    return draft ? { ...emptyForm(), ...draft, precheck: null, scan: emptyForm().scan, step: 0 } : emptyForm();
  });
  const scanToken = useRef(0);
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
     * Stores a front or label photo and recognises the shirt from every photo
     * taken so far (front + inner label together work best). The result
     * prefills the wizard without overriding what the member already chose.
     */
    runScan: async (key: 'front' | 'product_code', photo: Photo & { dataUrl: string }, lang: string, kitLabel: (kit: string) => string) => {
      const token = ++scanToken.current;
      const photos = { ...f.photos, [key]: photo };
      set((s) => ({ photos: { ...s.photos, [key]: photo }, scan: { ...s.scan, status: 'scanning' } }));
      const images = (['front', 'product_code'] as const)
        .filter((k) => photos[k]?.dataUrl)
        .map((k) => ({ kind: k === 'front' ? ('front' as const) : ('label' as const), dataUrl: photos[k]!.dataUrl! }));
      try {
        const r = await identifyShirt(images, lang);
        if (scanToken.current !== token) return;
        if (!r.ok) {
          set((s) => ({ scan: { ...s.scan, status: r.reason === 'off' ? 'off' : r.reason === 'rate_limited' ? 'limited' : 'error' } }));
          return;
        }
        set((s) => ({
          ...wizardPatch(r.result, s, kitLabel, (g) => SIZE_GROUPS[g as keyof typeof SIZE_GROUPS] ?? []),
          scan: { status: 'done', confidence: r.result.confidence, matchId: r.result.catalogId, result: r.result }
        }));
      } catch {
        if (scanToken.current === token) set((s) => ({ scan: { ...s.scan, status: 'error' } }));
      }
    },
    runPrecheck: () =>
      set((s) => {
        const p = precheck(s);
        const level = p.status === 'ok' ? (s.verification.level === 'expert' ? 'expert' : 'precheck') : s.verification.level;
        return { precheck: p, verification: { ...s.verification, level } };
      }),
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
