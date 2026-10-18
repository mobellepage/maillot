// Automatic pre-check for a new collection item: pure, no I/O, unit-tested.
import type { Precheck } from '../../../types/domain.ts';
import type { AddShirtForm } from './useAddShirtForm.ts';

import { AI_MATCH_THRESHOLD } from '../../identify/prefill.ts';
import type { AuthCheck } from '../../../utils/db.ts';

type Input = Pick<AddShirtForm, 'photos' | 'scan' | 'catalogId' | 'version' | 'proposed'>;

/** Pure pre-check from real signals (photo recognition, photo sharpness, plausibility). Notes are message keys. */
export function precheck(s: Input): Precheck {
  const notes: string[] = [];
  let status: Precheck['status'] = 'ok';
  // The inner label is only needed to sell; when it is there it has to be readable.
  const code = s.photos.product_code;
  if (code?.lowRes) {
    notes.push('pc.codeUnreadable');
    status = 'review';
  }
  if (code && code.blurry) {
    notes.push('pc.codeBlurry');
    status = 'review';
  }
  const seen = s.scan.result;
  if (!seen) {
    notes.push('pc.noText');
    status = 'review';
  } else if (!seen.isShirt) {
    notes.push('pc.notShirt');
    status = 'review';
  } else if (s.catalogId && s.scan.matchId === s.catalogId && s.scan.confidence < AI_MATCH_THRESHOLD) {
    notes.push('pc.weakMatch');
    status = 'review';
  } else if (s.catalogId && s.scan.matchId && s.scan.matchId !== s.catalogId && s.scan.confidence >= AI_MATCH_THRESHOLD) {
    // Strongest single fraud signal: the label confidently matches a *different*
    // catalogue item than the one selected (mislabelled or swapped label).
    notes.push('pc.otherItem');
    status = 'fake';
  }
  // Visible inconsistencies the recognition pointed out (label layout, code, crest quality).
  if (seen?.authenticityConcerns.length) {
    notes.push('pc.aiConcerns');
    if (status === 'ok') status = 'review';
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


const RANK: Record<Precheck['status'], number> = { ok: 0, review: 1, fake: 2 };
const FROM_AI: Record<AuthCheck['verdict'], Precheck['status']> = { no_issues: 'ok', please_check: 'review', possible_fake: 'fake' };

/**
 * Adds the AI pre-check to the local one: the stricter verdict wins, and the
 * AI's own reasons are kept. When the AI read the inner label, the local
 * "label not readable / no text" notes no longer apply.
 */
export function withAiCheck(local: Precheck, ai: AuthCheck | null): Precheck {
  if (!ai) return local;
  const readLabel = !!ai.productCode;
  const notes = local.notes.filter((n) => !(readLabel && (n === 'pc.codeUnreadable' || n === 'pc.noText')) && n !== 'pc.clean');
  if (ai.codeFits === 'no') notes.push('pc.codeMismatch');
  let status: Precheck['status'] = FROM_AI[ai.verdict];
  // Recompute the local verdict from what's left of its notes.
  const localStatus: Precheck['status'] = notes.includes('pc.otherItem') || notes.length >= 3 ? 'fake' : notes.some((n) => n !== 'pc.proposed') ? 'review' : 'ok';
  if (RANK[localStatus] > RANK[status]) status = localStatus;
  if (!notes.length && !ai.reasons.length) notes.push('pc.clean');
  return { status, notes, reasons: ai.reasons, productCode: ai.productCode };
}
