// Framing guides and quality checks for guided photo capture. Pure, so the
// rules are unit-tested; the camera UI lives in GuidedCapture.tsx.
import type { Photo } from '../../../types/domain.ts';

export type GuideShape = 'shirt' | 'square' | 'label';

/** Which outline to overlay on the camera for a photo slot. */
export function guideFor(key: string): GuideShape {
  if (key === 'front' || key === 'back') return 'shirt';
  if (['collar', 'product_code', 'hangtag', 'coa_front', 'coa_back', 'provenance_doc'].includes(key)) return 'label';
  return 'square';
}

/** Message keys for what's wrong with a captured photo, most important first. */
export function photoIssues(p: Pick<Photo, 'blurry' | 'lowRes' | 'tooDark' | 'tooBright'>): string[] {
  const issues: string[] = [];
  if (p.blurry) issues.push('gc.issue.blurry');
  if (p.tooDark) issues.push('gc.issue.dark');
  if (p.tooBright) issues.push('gc.issue.bright');
  if (p.lowRes) issues.push('gc.issue.lowRes');
  return issues;
}

/** The next slot that still needs a photo, after `fromKey` (wrapping around). */
export function nextMissing(keys: string[], have: Record<string, unknown>, fromKey?: string): string | null {
  const start = fromKey ? keys.indexOf(fromKey) + 1 : 0;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[(start + i) % keys.length]!;
    if (!have[k]) return k;
  }
  return null;
}
