// Display logic for collection items (badges, names, share payload).
import { BY } from '../../data.ts';
import type { CustomItem, Photo } from '../../types/domain.ts';
import { HEX, alpha, type Tone } from '../../ui/index.ts';
import { currentValuation } from './useCollection.ts';

/** label and desc are message keys. */
export interface VerifyBadge {
  label: string;
  tone: Tone;
  color: string;
  desc: string;
}

export const VERIFY_BADGES: Record<'self' | 'precheck' | 'expert' | 'rejected', VerifyBadge> = {
  self: { label: 'badge.self', tone: 'neutral', color: HEX.text2, desc: 'badge.self.desc' },
  precheck: { label: 'badge.precheck', tone: 'info', color: HEX.info, desc: 'badge.precheck.desc' },
  expert: { label: 'badge.expert', tone: 'warn', color: HEX.warn, desc: 'badge.expert.desc' },
  rejected: { label: 'badge.rejected', tone: 'neg', color: HEX.neg, desc: 'badge.rejected.desc' }
};

export function badgeFor(c: CustomItem): VerifyBadge {
  if (c.verification.status === 'abgelehnt') return VERIFY_BADGES.rejected;
  return VERIFY_BADGES[c.verification.level] ?? VERIFY_BADGES.self;
}

export function itemName(c: CustomItem): string {
  const cat = c.catalogId ? BY[c.catalogId] : undefined;
  return cat ? cat.name : [c.proposedClub, c.proposedSeason, c.proposedVariant].filter(Boolean).join(' ') || 'Untitled shirt';
}

export function itemLook(c: CustomItem) {
  const cat = c.catalogId ? BY[c.catalogId] : undefined;
  return {
    look: { pat: cat ? cat.pat : HEX.placeholderPat, trim: cat ? cat.trim : HEX.muted, crest: cat ? cat.crest : HEX.muted },
    glow: alpha(cat ? cat.glow : HEX.muted, 0.3)
  };
}

/** The picture that represents an item: its studio photo (cut out, dark background) when there is one. */
export function mainPhoto(c: CustomItem): Photo | undefined {
  return c.photos?.front_studio ?? c.photos?.front;
}

export function valueOf(c: CustomItem): number | null {
  const v = currentValuation(c);
  return v && !v.blocked ? v.mid : null;
}
