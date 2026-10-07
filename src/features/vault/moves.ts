// How a collection moved over the last week: each owned shirt changes like
// its catalogue market value did (the item's condition and edition factors
// stay the same), and the biggest movers are listed.
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

/** Value ratio now / a week earlier per shirt (null when there's no week-old value yet). */
export function weeklyRatios(history: HistoryPoint[]): Map<string, number> {
  const by = new Map<string, HistoryPoint[]>();
  for (const p of history) by.set(p.catalog_id, [...(by.get(p.catalog_id) ?? []), p]);
  const out = new Map<string, number>();
  for (const [id, pts] of by) {
    const sorted = [...pts].sort((a, b) => a.day.localeCompare(b.day));
    const latest = sorted[sorted.length - 1]!;
    const cutoff = Date.parse(latest.day) - 7 * DAY;
    const before = sorted.filter((p) => Date.parse(p.day) <= cutoff).pop();
    if (before && Number(before.value) > 0) out.set(id, Number(latest.value) / Number(before.value));
  }
  return out;
}

export function weeklyMoves(items: Owned[], history: HistoryPoint[]): { change: number; pct: number; movers: Move[] } | null {
  const ratios = weeklyRatios(history);
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
