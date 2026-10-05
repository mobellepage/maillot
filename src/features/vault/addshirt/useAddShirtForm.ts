// Local state for the "add a shirt" wizard. Short-lived and complex, so it
// stays out of server state; only the finished item is saved. The draft
// (minus photos) survives reloads in localStorage.
import { useCallback, useEffect, useRef, useState } from 'react';
import { matchCatalogFromOcrText } from '../../../addShirtData.js';
import { enqueueReview, findReview } from '../../../utils/db.ts';
import { loadJSON, saveJSON } from '../../../utils/storage.ts';
import { readLabelText } from '../../../utils/ocr.ts';
import { useLive } from '../../../lib/realtime.ts';
import type { Condition, Flock, Photo, Precheck, Review, Signature, Verification, Visibility } from '../../../types/domain.ts';

const DRAFT_KEY = 'kv_add_shirt_draft_v1';
// Below this word-overlap confidence a scan is "found some text" rather than a match.
export const SCAN_AUTO_MATCH_THRESHOLD = 0.34;

export interface ScanState {
  status: 'idle' | 'scanning' | 'done' | 'error';
  ocrText: string;
  confidence: number;
  matchId: string | null;
}

export interface AddShirtForm {
  step: number;
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
}

function emptyForm(): AddShirtForm {
  return {
    step: 0,
    scan: { status: 'idle', ocrText: '', confidence: 0, matchId: null },
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
    salePrice: ''
  };
}

/** Pure pre-check from real signals (OCR match, photo sharpness, plausibility). Unit-testable. */
export function precheck(s: AddShirtForm): Precheck {
  const notes: string[] = [];
  let status: Precheck['status'] = 'ok';
  const code = s.photos.product_code;
  if (!code || code.lowRes) {
    notes.push('Artikelnummer auf dem Innenetikett ist nicht klar genug lesbar.');
    status = 'review';
  }
  if (code && code.blurry) {
    notes.push('Foto des Artikelnummer-Etiketts wirkt unscharf.');
    status = 'review';
  }
  if (!s.scan.ocrText) {
    notes.push('Automatische Texterkennung konnte auf dem Etikett keinen Text finden — wird manuell geprüft.');
    status = 'review';
  } else if (s.catalogId && s.scan.matchId === s.catalogId && s.scan.confidence < SCAN_AUTO_MATCH_THRESHOLD) {
    notes.push('Erkannter Text auf dem Etikett stimmt nur schwach mit dem gewählten Katalogartikel überein.');
    status = 'review';
  } else if (s.catalogId && s.scan.matchId && s.scan.matchId !== s.catalogId && s.scan.confidence >= SCAN_AUTO_MATCH_THRESHOLD) {
    // Strongest single fraud signal: the label confidently matches a *different*
    // catalogue item than the one selected (mislabelled or swapped label).
    notes.push('Das Etikett passt mit hoher Sicherheit zu einem anderen Katalogartikel als dem ausgewählten — mögliche Fehlzuordnung oder Fälschung.');
    status = 'fake';
  }
  if (Object.values(s.photos).some((p) => p.blurry) && status === 'ok') {
    notes.push('Mindestens ein Pflichtfoto ist unscharf.');
    status = 'review';
  }
  if (s.version === 'Player-Issue / Authentic' && !s.photos.flock_closeup) {
    notes.push('Player-Issue angegeben, aber kein Flock-Detailfoto vorhanden.');
    status = 'review';
  }
  if (!s.catalogId && s.proposed) notes.push('Dieses Trikot ist noch nicht im Katalog — der Vorschlag wird manuell geprüft.');
  if (notes.length >= 3) status = 'fake';
  if (!notes.length) notes.push('Keine Auffälligkeiten bei Artikelnummer, Fotoqualität und Plausibilität.');
  return { status, notes };
}

export function useAddShirtForm(userId: string | undefined) {
  const [f, setRaw] = useState<AddShirtForm>(() => {
    const draft = loadJSON<Partial<AddShirtForm> | null>(DRAFT_KEY, null);
    // Photos are never persisted (data URLs would overflow storage), so a
    // resumed draft always rewinds to the scan step.
    return draft ? { ...emptyForm(), ...draft, photos: {}, precheck: null, scan: emptyForm().scan, step: 0 } : emptyForm();
  });
  const scanToken = useRef(0);
  const set = (patch: Partial<AddShirtForm> | ((s: AddShirtForm) => Partial<AddShirtForm>)) => setRaw((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));

  useEffect(() => {
    // eslint-disable-next-line no-unused-vars
    const { photos, precheck: _p, scan, ...draft } = f;
    saveJSON(DRAFT_KEY, draft);
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
        if (entry.status === 'rejected') return { ...s, verification: { ...s.verification, status: 'abgelehnt', reason: entry.reason || 'Unstimmigkeiten konnten nicht ausgeräumt werden.' } };
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
    runScan: async (photo: Photo) => {
      const token = ++scanToken.current;
      set((s) => ({ photos: { ...s.photos, product_code: photo }, scan: { status: 'scanning', ocrText: '', confidence: 0, matchId: null } }));
      try {
        const text = await readLabelText(photo.dataUrl);
        if (scanToken.current !== token) return;
        const { item, confidence } = matchCatalogFromOcrText(text);
        const confident = !!item && confidence >= SCAN_AUTO_MATCH_THRESHOLD;
        set((s) => ({
          scan: { status: 'done', ocrText: text, confidence, matchId: item ? item.id : null },
          catalogId: confident ? item!.id : s.catalogId,
          proposed: confident ? false : s.proposed,
          searchQ: confident ? item!.name : s.searchQ
        }));
      } catch {
        if (scanToken.current === token) set({ scan: { status: 'error', ocrText: '', confidence: 0, matchId: null } });
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
    reset: () => {
      saveJSON(DRAFT_KEY, null);
      setRaw(emptyForm());
    }
  };
}

export type Wizard = ReturnType<typeof useAddShirtForm>;
