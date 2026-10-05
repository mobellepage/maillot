// Automatic pre-check for a new collection item: pure, no I/O, unit-tested.
import type { Precheck } from '../../../types/domain.ts';
import type { AddShirtForm } from './useAddShirtForm.ts';

// Below this word-overlap confidence a scan is "found some text" rather than a match.
export const SCAN_AUTO_MATCH_THRESHOLD = 0.34;

type Input = Pick<AddShirtForm, 'photos' | 'scan' | 'catalogId' | 'version' | 'proposed'>;

/** Pure pre-check from real signals (OCR match, photo sharpness, plausibility). Notes are message keys. */
export function precheck(s: Input): Precheck {
  const notes: string[] = [];
  let status: Precheck['status'] = 'ok';
  const code = s.photos.product_code;
  if (!code || code.lowRes) {
    notes.push('pc.codeUnreadable');
    status = 'review';
  }
  if (code && code.blurry) {
    notes.push('pc.codeBlurry');
    status = 'review';
  }
  if (!s.scan.ocrText) {
    notes.push('pc.noText');
    status = 'review';
  } else if (s.catalogId && s.scan.matchId === s.catalogId && s.scan.confidence < SCAN_AUTO_MATCH_THRESHOLD) {
    notes.push('pc.weakMatch');
    status = 'review';
  } else if (s.catalogId && s.scan.matchId && s.scan.matchId !== s.catalogId && s.scan.confidence >= SCAN_AUTO_MATCH_THRESHOLD) {
    // Strongest single fraud signal: the label confidently matches a *different*
    // catalogue item than the one selected (mislabelled or swapped label).
    notes.push('pc.otherItem');
    status = 'fake';
  }
  if (Object.values(s.photos).some((p) => p.blurry) && status === 'ok') {
    notes.push('pc.blurry');
    status = 'review';
  }
  if (s.version === 'Player-Issue / Authentic' && !s.photos.flock_closeup) {
    notes.push('pc.playerNoFlock');
    status = 'review';
  }
  if (!s.catalogId && s.proposed) notes.push('pc.proposed');
  if (notes.length >= 3) status = 'fake';
  if (!notes.length) notes.push('pc.clean');
  return { status, notes };
}

