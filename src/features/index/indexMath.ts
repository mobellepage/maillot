// The Maillot Shirt Index: a value-weighted composite of every catalogue
// shirt's market price (the valuation model where it has evidence — sales and
// comparables — otherwise the catalogue estimate), with segment breakdowns and
// a CSV export.
export type IndexInput = { id: string; name: string; league: string; type: string; price: number; ch: number; priceSource: 'market' | 'trades' | 'estimate' };

export type Segment = { name: string; count: number; avgPrice: number; change: number };

/** Value-weighted 30-day change in percent: big-ticket shirts move the index more. */
export function weightedChange(rows: IndexInput[]): number {
  const total = rows.reduce((a, r) => a + r.price, 0);
  if (!total) return 0;
  return rows.reduce((a, r) => a + r.price * r.ch, 0) / total;
}

export function composite(rows: IndexInput[]) {
  const value = rows.reduce((a, r) => a + r.price, 0);
  return {
    count: rows.length,
    value,
    avgPrice: rows.length ? value / rows.length : 0,
    change: weightedChange(rows),
    /** Shirts priced from evidence (sales or comparables) rather than the estimate. */
    fromMarket: rows.filter((r) => r.priceSource !== 'estimate').length
  };
}

export function segments(rows: IndexInput[], key: 'league' | 'type'): Segment[] {
  const groups = new Map<string, IndexInput[]>();
  for (const r of rows) groups.set(r[key], [...(groups.get(r[key]) ?? []), r]);
  return [...groups.entries()]
    .map(([name, rs]) => ({ name, count: rs.length, avgPrice: rs.reduce((a, r) => a + r.price, 0) / rs.length, change: weightedChange(rs) }))
    .sort((a, b) => b.change - a.change);
}

const csvCell = (v: string | number) => (typeof v === 'number' ? String(v) : /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function toCsv(rows: IndexInput[]): string {
  const head = ['shirt_id', 'name', 'league', 'type', 'market_price_chf', 'change_30d_pct', 'price_source'];
  return [head, ...rows.map((r) => [r.id, r.name, r.league, r.type, r.price, r.ch, r.priceSource])].map((row) => row.map(csvCell).join(',')).join('\n') + '\n';
}
