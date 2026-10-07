// Turns a recognition result into form values for the add-shirt wizard and
// the sell flow. Only confident matches pick a catalogue shirt; everything
// else is a suggestion the member confirms.
import type { Identification } from '../../utils/db.ts';

/** Below this, a catalogue match is shown as "maybe" instead of being picked. */
export const AI_MATCH_THRESHOLD = 0.6;

const GRADE_TO_SCALE = { new_with_tags: 10, excellent: 9, very_good: 8, good: 6, worn: 4 } as const;
const GRADE_TO_SELL = { new_with_tags: 'New with tags', excellent: 'Excellent', very_good: 'Very good', good: 'Good', worn: 'Good' } as const;
const VERSION_TO_WIZARD = { replica: 'Fan-Replica', authentic: 'Player-Issue / Authentic', match_worn: 'Match-Worn' } as const;
const VERSION_TO_SELL = { replica: 'Replica', authentic: 'Authentic', match_worn: 'Match-worn' } as const;

export const confidentMatch = (r: Identification) => (r.catalogId && r.confidence >= AI_MATCH_THRESHOLD ? r.catalogId : null);

/** Shirt name for an uncatalogued shirt: "Netherlands 1988 Home". */
export function proposedName(r: Identification, kitLabel: (kit: string) => string) {
  return [r.club, r.season, r.kit !== 'unknown' ? kitLabel(r.kit) : ''].filter(Boolean).join(' ');
}

interface WizardFields {
  catalogId: string | null;
  proposed: boolean;
  proposedClub: string;
  proposedSeason: string;
  proposedVariant: string;
  searchQ: string;
  version: string;
  size: string;
  sizeGroup: string;
  tagsAttached: boolean;
  condition: { grade: number; defects: string[] };
  flock: { source: string; name: string; number: string; type: string };
}

/** Fields the wizard takes from a result. Never overwrites what the member already chose. */
export function wizardPatch(r: Identification, f: WizardFields, kitLabel: (kit: string) => string, sizesOf: (group: string) => string[]): Partial<WizardFields> {
  const patch: Partial<WizardFields> = {};
  const match = confidentMatch(r);
  if (!f.catalogId && !f.proposed) {
    if (match) Object.assign(patch, { catalogId: match, proposed: false });
    else if (r.club && r.season) Object.assign(patch, { proposed: true, proposedClub: r.club, proposedSeason: r.season, proposedVariant: r.kit !== 'unknown' ? kitLabel(r.kit) : '' });
    if (r.club) patch.searchQ = proposedName(r, kitLabel);
  }
  if (!f.version && r.version !== 'unknown') patch.version = VERSION_TO_WIZARD[r.version];
  if (r.labelSize && sizesOf(f.sizeGroup).includes(r.labelSize.toUpperCase())) patch.size = r.labelSize.toUpperCase();
  if (r.condition.grade !== 'unknown') {
    patch.condition = { ...f.condition, grade: GRADE_TO_SCALE[r.condition.grade] };
    if (r.condition.grade === 'new_with_tags') patch.tagsAttached = true;
  }
  if (f.flock.source === 'Keine' && (r.playerName || r.playerNumber)) patch.flock = { ...f.flock, source: 'Spielername & Nummer', name: r.playerName ?? '', number: r.playerNumber ?? '' };
  return patch;
}

/** Condition, edition and print for the sell flow. */
export function sellPrefill(r: Identification) {
  return {
    condition: r.condition.grade !== 'unknown' ? GRADE_TO_SELL[r.condition.grade] : null,
    edition: r.version !== 'unknown' ? VERSION_TO_SELL[r.version] : null,
    player: [r.playerName, r.playerNumber].filter(Boolean).join(' ') || null
  };
}
