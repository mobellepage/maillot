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

/**
 * The shirt's picture from the library (or the catalogue): what leads in the
 * member's own collection, so every collection looks like a catalogue; their
 * own photos follow. small = the 400 px catalogue file.
 */
export function libraryPicture(c: CustomItem, small = false): string | undefined {
  if (c.kitImage) return c.kitImage;
  const photo = c.catalogId ? BY[c.catalogId]?.photo : undefined;
  if (!photo) return undefined;
  return photo.endsWith('.webp') ? photo : photo + (small ? '-400.webp' : '.webp');
}

export function valueOf(c: CustomItem): number | null {
  const v = currentValuation(c);
  return v && !v.blocked ? v.mid : null;
}

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

/**
 * The league a collection shirt belongs to: the catalogue's, else the
 * library club's (by name or short name), else null.
 */
export function leagueOf(c: CustomItem, clubs: { name: string; aliases?: string[] | null; league: string }[]): string | null {
  const cat = c.catalogId ? BY[c.catalogId] : undefined;
  if (cat?.league) return cat.league;
  const club = norm(c.proposedClub || '');
  if (!club) return null;
  const hit = clubs.find((k) => norm(k.name) === club || (k.aliases ?? []).some((a) => norm(a) === club));
  return hit?.league ?? null;
}

/** Highlights first, in the order they were marked; the others keep their order. */
export function highlightsFirst<T extends { highlightedAt?: number | null }>(xs: T[]): T[] {
  const rank = (x: T) => x.highlightedAt ?? Number.MAX_SAFE_INTEGER;
  return xs
    .map((x, i) => ({ x, i }))
    .sort((a, b) => rank(a.x) - rank(b.x) || a.i - b.i)
    .map((o) => o.x);
}
