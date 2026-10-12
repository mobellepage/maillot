// How a collection moved over a period (a week, 30 days, a year): each owned
// shirt changes like its catalogue market value did (the item's condition
// and edition factors stay the same), and the biggest movers are listed.
export interface Owned {
  id: string;
  catalogId: string | null;
  name: string;
  value: number | null;
}
export interface HistoryPoint {
  catalog_id: string;
  day: string;
  value: number;
}
export interface Move {
  id: string;
  name: string;
  change: number;
  pct: number;
}

const DAY = 864e5;

/** Value ratio now / `days` earlier per shirt (missing when there's no value that old yet). */
export function ratiosOver(history: HistoryPoint[], days: number): Map<string, number> {
  const by = new Map<string, HistoryPoint[]>();
  for (const p of history) by.set(p.catalog_id, [...(by.get(p.catalog_id) ?? []), p]);
  const out = new Map<string, number>();
  for (const [id, pts] of by) {
    const sorted = [...pts].sort((a, b) => a.day.localeCompare(b.day));
    const latest = sorted[sorted.length - 1]!;
    const cutoff = Date.parse(latest.day) - days * DAY;
    const before = sorted.filter((p) => Date.parse(p.day) <= cutoff).pop();
    if (before && Number(before.value) > 0) out.set(id, Number(latest.value) / Number(before.value));
  }
  return out;
}

/** Value ratio now / a week earlier per shirt. */
export const weeklyRatios = (history: HistoryPoint[]) => ratiosOver(history, 7);

export function movesOver(items: Owned[], history: HistoryPoint[], days: number): { change: number; pct: number; movers: Move[] } | null {
  const ratios = ratiosOver(history, days);
  let now = 0;
  let change = 0;
  const movers: Move[] = [];
  for (const it of items) {
    const r = it.catalogId ? ratios.get(it.catalogId) : undefined;
    if (it.value == null || r === undefined) continue;
    const c = it.value * (1 - 1 / r);
    now += it.value;
    change += c;
    if (Math.abs(r - 1) >= 0.005) movers.push({ id: it.id, name: it.name, change: c, pct: (r - 1) * 100 });
  }
  if (!now) return null;
  movers.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
  return { change, pct: (change / (now - change)) * 100, movers: movers.slice(0, 3) };
}

export const weeklyMoves = (items: Owned[], history: HistoryPoint[]) => movesOver(items, history, 7);
