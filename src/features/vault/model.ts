// Display logic for collection items (badges, names, share payload).
import { BY } from '../../data.ts';
import type { CustomItem } from '../../types/domain.ts';
import { HEX, alpha, type Tone } from '../../ui/index.ts';
import { currentValuation } from './useCollection.ts';

export interface VerifyBadge {
  label: string;
  tone: Tone;
  color: string;
  desc: string;
}

export const VERIFY_BADGES: Record<'self' | 'precheck' | 'expert' | 'rejected', VerifyBadge> = {
  self: { label: 'Self-reported', tone: 'neutral', color: HEX.text2, desc: 'Details come from the owner only — not yet checked.' },
  precheck: { label: 'Pre-checked', tone: 'info', color: HEX.info, desc: 'Automatic photo and label checks found nothing unusual — no human has seen it yet.' },
  expert: { label: 'Expert-verified', tone: 'warn', color: HEX.warn, desc: 'A specialist reviewed the submission and approved it.' },
  rejected: { label: 'Rejected', tone: 'neg', color: HEX.neg, desc: 'The submission was rejected in review.' }
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

export function valueOf(c: CustomItem): number | null {
  const v = currentValuation(c);
  return v && !v.blocked ? v.mid : null;
}
