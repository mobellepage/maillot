// The daily shirt puzzle ("Trikot-Rätsel"): one catalogue shirt a day,
// shown as a zoomed-in crop that widens with every wrong guess. Guess the
// club and the season. Pure, so it's unit-tested; the page is DailyPage.tsx.

export const MAX_TRIES = 5;
/** Zoom per attempt (1 = the whole shirt). After the last try the whole shirt shows. */
export const ZOOMS = [4.2, 3, 2.1, 1.5, 1.12] as const;
/** Puzzle #1 was this day (Europe/Zurich). */
const FIRST_DAY = Date.UTC(2026, 9, 13);
const DAY = 86_400_000;

/** Today's date in Zurich as YYYY-MM-DD — everyone gets the new puzzle at Swiss midnight. */
export function dayKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function puzzleNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return Math.round((Date.UTC(y, m - 1, d) - FIRST_DAY) / DAY) + 1;
}

/** FNV-1a: a small stable hash, so every device picks the same shirt. */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The shirt for a puzzle: the catalogue in a fixed shuffled order, one a day. */
export function pickShirt(ids: readonly string[], n: number): string | null {
  if (!ids.length) return null;
  const order = [...ids].sort((a, b) => hash('kit:' + a) - hash('kit:' + b) || a.localeCompare(b));
  return order[(((n - 1) % order.length) + order.length) % order.length]!;
}

/** Where the crop is centred, in % of the picture: crest, collar, sponsor/chest or sleeve. */
export const FOCI = [
  { key: 'crest', x: 61, y: 27 },
  { key: 'collar', x: 50, y: 12 },
  { key: 'chest', x: 45, y: 45 },
  { key: 'sleeve', x: 80, y: 28 }
] as const;
export function focusFor(id: string, n: number) {
  return FOCI[hash(id + ':' + n) % FOCI.length]!;
}

export interface Guess {
  club: string;
  year: number;
}
export interface Verdict {
  club: boolean;
  /** exact season, within two years, or further off */
  season: 'exact' | 'close' | 'far';
  /** which way the real season is from the guess */
  dir: 'later' | 'earlier' | null;
}

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '');

export function judge(g: Guess, answer: Guess): Verdict {
  const diff = answer.year - g.year;
  return {
    club: norm(g.club) === norm(answer.club),
    season: diff === 0 ? 'exact' : Math.abs(diff) <= 2 ? 'close' : 'far',
    dir: diff > 0 ? 'later' : diff < 0 ? 'earlier' : null
  };
}

export const solved = (v: Verdict) => v.club && v.season === 'exact';

/** The spoiler-free grid people share: one row per guess, club then season. */
export function shareText(n: number, verdicts: Verdict[], won: boolean, title: string, url: string): string {
  const rows = verdicts.map((v) => (v.club ? '🟩' : '⬛') + (v.season === 'exact' ? '🟩' : v.season === 'close' ? '🟨' : '⬛'));
  return `${title} #${n} ${won ? verdicts.length : 'X'}/${MAX_TRIES}\n${rows.join('\n')}\n${url}`;
}

export interface DayResult {
  day: string;
  won: boolean;
  tries: number;
}

/** Played, wins, streaks and how many tries the wins took. A streak survives until today's puzzle is missed. */
export function stats(results: DayResult[], today: string) {
  const byDay = new Map(results.map((r) => [r.day, r]));
  const days = [...byDay.keys()].sort();
  const won = results.filter((r) => r.won);
  const dist = Array.from({ length: MAX_TRIES }, (_, i) => won.filter((r) => r.tries === i + 1).length);
  let max = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of days) {
    const n = puzzleNumber(d);
    run = byDay.get(d)!.won ? (prev !== null && n === prev + 1 ? run + 1 : 1) : 0;
    if (!byDay.get(d)!.won) prev = null;
    else prev = n;
    max = Math.max(max, run);
  }
  // Current streak: count back from today (or yesterday, if today isn't played yet).
  let current = 0;
  let n = puzzleNumber(today);
  const at = (k: number) => results.find((r) => puzzleNumber(r.day) === k);
  if (!at(n)) n--;
  while (at(n)?.won) {
    current++;
    n--;
  }
  return { played: byDay.size, wins: won.length, winPct: byDay.size ? Math.round((won.length / byDay.size) * 100) : 0, current, max, dist };
}
