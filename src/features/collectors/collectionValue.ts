// The total a collector chose to show on their profile: the same estimate
// as in their own vault (estimateValue), summed over the shirts on display.
// Only computed from what public_collection returns when the owner opted in.
import { BY } from '../../data.ts';
import { estimateValue } from '../../addShirtData.js';
import type { Flock, Signature, Valuation } from '../../types/domain.ts';
import type { PublicShirt } from '../../utils/db.ts';

export function publicCollectionValue(shirts: PublicShirt[]): { total: number; counted: number } {
  let total = 0;
  let counted = 0;
  for (const s of shirts) {
    if (s.grade === null) continue;
    const v = estimateValue({
      catalogItem: s.catalog_id ? (BY[s.catalog_id] ?? null) : null,
      version: s.version,
      conditionGrade: Number(s.grade),
      flock: (s.flock as unknown as Flock | null) ?? { source: 'Keine' },
      patches: Array.isArray(s.patches) ? s.patches : [],
      signature: (s.signature as unknown as Signature | null) ?? { signed: false },
      verificationLevel: s.verification_level ?? 'self'
    }) as Valuation;
    if (v.blocked) continue;
    total += v.mid;
    counted++;
  }
  return { total, counted };
}
