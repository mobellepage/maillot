// Fantasy — the game's rules in one place. The database decides with the
// same numbers (private.fantasy_md_policy()); change both together.
// Nothing in the game is for sale.

export const FANTASY = {
  /** A squad of eight jerseys; five play each Gameweek, three sit on the bench. */
  squadSize: 8,
  starters: 5,
  /** Prices are in millions; the whole squad must fit in the budget. */
  budget: 100,
  /** At most this many jerseys from one league (nations don't count). */
  maxPerLeague: 2,
  /** One free transfer a Gameweek; an unused one rolls over, up to freeTransfersMax; each further transfer costs hitPoints. */
  freeTransfers: 1,
  freeTransfersMax: 5,
  hitPoints: 4,
  /** What a club scores per match it plays in the Gameweek. */
  points: { win: 3, draw: 1, defeat: 0 },
  /** The captain counts double — only a club whose shirt you own can be captain. */
  captainMult: 2,
  /** The deadline: Friday 18:00 Swiss time; the Gameweek runs until Tuesday morning. */
  deadlineHour: 18,
  timeZone: 'Europe/Zurich',
  windowHours: 84,
  /** Every so many Gameweeks is an international break (nations play, clubs don't). */
  internationalEvery: 5,
  /** Once a season each: Bench Boost (the bench scores too), Wildcard (free transfers), Free Hit (free transfers for one Gameweek, then the squad comes back). */
  chips: ['bench_boost', 'wildcard', 'free_hit'] as const
} as const;
export type Chip = (typeof FANTASY.chips)[number];
