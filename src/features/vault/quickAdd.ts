// A shirt from the library into the collection without photos: what quick
// add (the page and the library's pop-up) saves. Valued like a shirt in good
// condition until the member says more.
import { estimateValue } from '../../addShirtData.js';
import { BY } from '../../data.ts';
import type { Valuation } from '../../types/domain.ts';
import type { Kit } from '../../utils/db.ts';
import { KIND_WORD } from '../library/model.ts';
import { chosenVisibility } from './addshirt/useAddShirtForm.ts';

export interface QuickFlock {
  source: string;
  name: string;
  number: string;
}

export function quickItem(kit: Pick<Kit, 'id' | 'season' | 'kind' | 'variant' | 'catalog_id'>, clubName: string, size: string, version: string, flock: QuickFlock, collectionPrivate: boolean | undefined) {
  const catalogItem = kit.catalog_id ? (BY[kit.catalog_id] ?? null) : null;
  const flockOut = flock.source === 'Keine' ? { source: 'Keine' } : { source: flock.source, name: flock.name.trim(), number: flock.number.trim(), type: 'Unbekannt' };
  const condition = { grade: 8, defects: [] as string[] };
  const valuation = estimateValue({ catalogItem, version: version || 'Fan-Replica', conditionGrade: condition.grade, flock: flockOut, patches: [], signature: { signed: false }, verificationLevel: 'self' }) as Valuation;
  return {
    catalogId: catalogItem?.id ?? null,
    proposed: !catalogItem,
    proposedClub: clubName,
    proposedSeason: kit.season,
    proposedVariant: [KIND_WORD[kit.kind] ?? '', kit.variant].filter(Boolean).join(' '),
    version: version || null,
    sizeGroup: size ? 'Herren' : null,
    size: size || null,
    sleeve: null,
    flock: flockOut,
    patches: [],
    signature: { signed: false },
    tagsAttached: false,
    condition,
    provenance: '',
    photos: {},
    precheck: null,
    verification: { level: 'self' as const, status: 'none' as const, reason: '', reviewId: null },
    visibility: chosenVisibility({ visibility: null }, collectionPrivate),
    salePrice: '',
    valuation,
    kitId: kit.id
  };
}
