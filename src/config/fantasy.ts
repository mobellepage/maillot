// Fantasy — the game's rules in one place. The database decides with the
// same numbers (private.fantasy_policy()); change both together. Nothing in
// the game is for sale: packs come with time, Kit Points come from playing.

export const FANTASY = {
  /** A free pack every so many hours; unopened packs stack up to packStack. */
  packIntervalHours: 12,
  packStack: 2,
  cardsPerPack: 5,
  /** Chance of each rarity per card, in %. Shown on the odds page. */
  odds: { common: 60, rare: 28, epic: 10, legendary: 2 },
  /** Kit Points a duplicate card is worth. */
  duplicatePoints: { common: 5, rare: 15, epic: 40, legendary: 120 },
  /** An extra pack costs this many Kit Points, at most extraPacksPerDay a day. */
  extraPackCost: 150,
  extraPacksPerDay: 2,
  /** Three missions a day ("open your pack" always among them); all three done pays a bonus. */
  missionsPerDay: 3,
  missionPoints: 20,
  allMissionsBonus: 30,
  /** Opening a pack on consecutive days: +streakBonus per day of the streak, up to streakBonusMax. */
  streakBonus: 5,
  streakBonusMax: 50,
  /** Share of cards drawn from the player's world (their leagues, favourite club, clubs they own) rather than from every featured club. */
  interestShare: 0.6,
  /**
   * What makes one of your own shirts a Gold card: a library kit and your own
   * front photo — plus this verification: 'self' (none), 'precheck' (AI
   * pre-check or verified) or 'expert'. Verified shirts carry a badge either way.
   */
  goldMinLevel: 'self' as 'self' | 'precheck' | 'expert'
} as const;

/** Matchday — private.fantasy_md_policy() decides the same way. */
export const MATCHDAY = {
  lineupSize: 5,
  /** The five cards' reference values (CHF, replica) must not exceed this. */
  budgetChf: 1000,
  points: { win: 3, draw: 1, goal: 1, cleanSheet: 2 },
  multipliers: { gold: 2, captain: 2, goldRush: 3, tripleCaptain: 3, derby: 2 },
  prediction: { exact: 5, outcome: 2 },
  /** The line-up locks this long before the window opens (Saturday 12:00 UTC); the window lasts windowHours. */
  deadlineHoursBefore: 1,
  windowHours: 36,
  /** Reference value by rarity for kits without a price-index value. */
  valueChf: { common: 80, rare: 150, epic: 260, legendary: 450 },
  chips: ['gold_rush', 'triple_captain', 'derby_day', 'wildcard'] as const
} as const;
export type Chip = (typeof MATCHDAY.chips)[number];

export type Rarity = keyof typeof FANTASY.odds;
export const RARITIES: Rarity[] = ['legendary', 'epic', 'rare', 'common'];
