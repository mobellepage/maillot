// Fantasy, pure helpers: the rules a squad must keep, what transfers cost,
// how long until the deadline. Unit-tested (src/__tests__/fantasy.test.js).
import { FANTASY, type Chip } from '../../config/fantasy.ts';

export interface SquadPick {
  club_id: string;
  league: string;
  price: number;
  is_national?: boolean;
}

export type SquadProblem = 'size' | 'budget' | 'league';

/** What keeps a squad from being saved: too few/many, over budget, three of one league. */
export function squadProblems(picks: SquadPick[], bank: number = FANTASY.budget): { problems: SquadProblem[]; leagues: string[]; cost: number } {
  const problems: SquadProblem[] = [];
  const cost = picks.reduce((a, p) => a + Number(p.price), 0);
  if (picks.length !== FANTASY.squadSize) problems.push('size');
  if (cost > bank + 1e-9) problems.push('budget');
  const byLeague = new Map<string, number>();
  for (const p of picks) if (!p.is_national) byLeague.set(p.league, (byLeague.get(p.league) ?? 0) + 1);
  const leagues = [...byLeague].filter(([, n]) => n > FANTASY.maxPerLeague).map(([l]) => l);
  if (leagues.length) problems.push('league');
  return { problems, leagues, cost };
}

/** The transfers of a Gameweek: the clubs in the new squad that weren't in the locked one. */
export function transfersMade(locked: string[], clubs: string[]): number {
  return clubs.filter((c) => !locked.includes(c)).length;
}

/** What those transfers cost in points (none before the first deadline, none under Wildcard or Free Hit). */
export function transferHits(transfers: number, free: number, chip: Chip | null, firstLocked: boolean): number {
  if (!firstLocked || chip === 'wildcard' || chip === 'free_hit') return 0;
  return Math.max(0, transfers - free) * FANTASY.hitPoints;
}

/** "11h 23m" until a time, "now" once it's passed; null when nothing is due. */
export function untilText(iso: string | null | undefined, now: number = Date.now()): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return 'now';
  const m = Math.ceil(ms / 60_000);
  const h = Math.floor(m / 60);
  if (h >= 48) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return h > 0 ? `${h}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`;
}

/** A price in millions, one decimal: "12.5 M". */
export function priceText(n: number | string): string {
  return `${Number(n).toFixed(1)} M`;
}

/** A price move, signed: "+0.4" / "−0.5". */
export function deltaText(n: number | string | null | undefined): string | null {
  if (n === null || n === undefined) return null;
  const v = Number(n);
  if (!v) return null;
  return (v > 0 ? '+' : '−') + Math.abs(v).toFixed(1);
}
