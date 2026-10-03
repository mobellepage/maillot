import { useEffect, useRef, useState } from 'react';
import { loadJSON, saveJSON } from '../../utils/storage.js';
import { readLabelText } from '../../utils/ocr.js';
import { matchCatalogFromOcrText } from '../../addShirtData.js';
import { enqueueReview, findReview } from '../../utils/db.js';

const DRAFT_KEY = 'kv_add_shirt_draft_v1';
// Below this word-overlap confidence, a scanned label is treated as "found some
// text but not a confident match" rather than auto-selecting the catalog item.
const SCAN_AUTO_MATCH_THRESHOLD = 0.34;

function emptyForm() {
  return {
    step: 0,
    scan: { status: 'idle', ocrText: '', confidence: 0, matchId: null }, // status: idle|scanning|done|error
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
    precheck: null, // { status: 'ok'|'review'|'fake', notes: [] }
    verification: { level: 'self', status: 'none', reason: '', reviewId: null }, // level: self|precheck|expert
    visibility: 'private',
    salePrice: ''
  };
}

// Local wizard state for the "Trikot hinzufügen" flow. Kept out of the central
// useMaillot() state on purpose — this form is complex, short-lived, and only the
// finished item needs to land in the global store (via onFinish/addCustomItem).
// `userId` is the Supabase auth user id (AddShirt is only reachable while signed in,
// see engine.js's requireAuth gate) — needed to attach the review-queue row to a real account.
export function useAddShirtForm(userId) {
  const [f, setRaw] = useState(() => {
    const draft = loadJSON(DRAFT_KEY, null);
    if (!draft) return emptyForm();
    // Photos (incl. the scanned product-code photo) are never persisted (data-URLs
    // would blow up localStorage), so a resumed draft always rewinds to the scan step.
    return { ...emptyForm(), ...draft, photos: {}, precheck: null, scan: emptyForm().scan, step: 0 };
  });
  const scanToken = useRef(0);

  const set = (patch) => setRaw((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));

  useEffect(() => {
    const { photos, precheck, scan, ...draft } = f;
    saveJSON(DRAFT_KEY, draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f]);

  const setPhoto = (key, data) => set((s) => ({ photos: { ...s.photos, [key]: data } }));
  const removePhoto = (key) =>
    set((s) => {
      const p = { ...s.photos };
      delete p[key];
      return { photos: p };
    });

  const toggleArray = (field, val) =>
    set((s) => {
      const arr = s[field];
      return { [field]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] };
    });

  // Real client-side OCR (Tesseract.js) on the product-code label photo, then a
  // real word-overlap match against the catalog. No fake delay: this is genuinely
  // async because text recognition takes real time to run in the browser.
  const runScan = async (photoData) => {
    const token = ++scanToken.current;
    setPhoto('product_code', photoData);
    set({ scan: { status: 'scanning', ocrText: '', confidence: 0, matchId: null } });
    try {
      const text = await readLabelText(photoData.dataUrl);
      if (scanToken.current !== token) return; // superseded by a newer scan
      const { item, confidence } = matchCatalogFromOcrText(text);
      const confident = item && confidence >= SCAN_AUTO_MATCH_THRESHOLD;
      setRaw((s) => ({
        ...s,
        scan: { status: 'done', ocrText: text, confidence, matchId: item ? item.id : null },
        catalogId: confident ? item.id : s.catalogId,
        proposed: confident ? false : s.proposed,
        searchQ: confident ? item.name : s.searchQ
      }));
    } catch (err) {
      if (scanToken.current !== token) return;
      set({ scan: { status: 'error', ocrText: '', confidence: 0, matchId: null } });
    }
  };

  // Instant, real pre-check: evaluates signals that already exist from real analysis
  // (Laplacian-variance blur/resolution check at upload time, real OCR text/match from
  // the scan step) — no artificial processing delay, because there's nothing left to wait on.
  const runPrecheck = () => {
    setRaw((s) => {
      const notes = [];
      let status = 'ok';
      const codePhoto = s.photos.product_code;
      if (!codePhoto || codePhoto.lowRes) {
        notes.push('Artikelnummer auf dem Innenetikett ist nicht klar genug lesbar.');
        status = 'review';
      }
      if (codePhoto && codePhoto.blurry) {
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
        // Strongest single fraud signal available here: the label photo's OCR text
        // confidently matches a *different* catalog item than the one the seller
        // selected — i.e. real photographic evidence contradicts the claimed item
        // (mislabelled stock or a swapped/counterfeit label). Outranks the generic
        // note-count threshold below, so it jumps straight to 'fake' on its own.
        notes.push('Das Etikett passt mit hoher Sicherheit zu einem anderen Katalogartikel als dem ausgewählten — mögliche Fehlzuordnung oder Fälschung.');
        status = 'fake';
      }
      const anyBlurry = Object.values(s.photos).some((p) => p.blurry);
      if (anyBlurry && status === 'ok') {
        notes.push('Mindestens ein Pflichtfoto ist unscharf.');
        status = 'review';
      }
      if (s.version === 'Player-Issue / Authentic' && !s.photos.flock_closeup) {
        notes.push('Player-Issue angegeben, aber kein Flock-Detailfoto vorhanden.');
        status = 'review';
      }
      if (!s.catalogId && s.proposed) {
        notes.push('Dieses Trikot ist noch nicht im Katalog — der Vorschlag wird manuell geprüft.');
      }
      if (notes.length >= 3) status = 'fake';
      if (notes.length === 0) notes.push('Keine Auffälligkeiten bei Artikelnummer, Fotoqualität und Plausibilität.');
      const level = status === 'ok' ? (s.verification.level === 'expert' ? 'expert' : 'precheck') : s.verification.level;
      return { ...s, precheck: { status, notes }, verification: { ...s.verification, level } };
    });
  };

  // Real human-in-the-loop verification: queues the submission into the genuine
  // Supabase-backed review_queue table and then polls that *same* table for a human
  // reviewer's actual decision from the /admin screen. Nothing here resolves on a timer —
  // if no one reviews it, it just stays "angefragt" forever, same as a real backlog would.
  const requestVerification = () => {
    if (!userId) return;
    setRaw((s) => ({ ...s, verification: { ...s.verification, status: 'angefragt' } }));
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
      .then((reviewId) => setRaw((s) => ({ ...s, verification: { ...s.verification, reviewId } })))
      .catch(() => setRaw((s) => ({ ...s, verification: { ...s.verification, status: 'none' } })));
  };

  useEffect(() => {
    if (f.verification.status !== 'angefragt' && f.verification.status !== 'in Prüfung') return;
    const reviewId = f.verification.reviewId;
    if (!reviewId) return;
    let cancelled = false;
    const sync = async () => {
      const entry = await findReview(reviewId).catch(() => null);
      if (cancelled || !entry) return;
      setRaw((s) => {
        if (s.verification.reviewId !== reviewId) return s;
        if (entry.status === 'approved') {
          return { ...s, verification: { level: 'expert', status: 'verifiziert', reason: '', reviewId } };
        }
        if (entry.status === 'rejected') {
          return { ...s, verification: { ...s.verification, status: 'abgelehnt', reason: entry.reason || 'Unstimmigkeiten konnten nicht ausgeräumt werden.' } };
        }
        if (entry.status === 'in_review' && s.verification.status !== 'in Prüfung') {
          return { ...s, verification: { ...s.verification, status: 'in Prüfung' } };
        }
        return s;
      });
    };
    sync();
    const interval = setInterval(sync, 1500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [f.verification.status, f.verification.reviewId]);

  const reset = () => {
    saveJSON(DRAFT_KEY, null);
    setRaw(emptyForm());
  };

  return { f, set, setPhoto, removePhoto, toggleArray, runScan, runPrecheck, requestVerification, reset };
}
