import { useState, type PointerEvent } from 'react';
import { down, linePath, pct, RANGES, TODAY, type Shirt } from '../../../data.ts';
import { usePrefs } from '../../../lib/prefs.tsx';
import { Badge, Segmented } from '../../../ui/index.ts';

const DAY = 864e5;
type Range = '1M' | '3M' | '6M' | '1Y' | 'ALL';

export function PriceHistory({ s }: { s: Shirt }) {
  const { money } = usePrefs();
  const [range, setRange] = useState<Range>('1Y');
  const [hover, setHover] = useState<number | null>(null);
  const slice = s.hist.slice(-Math.min(RANGES[range] ?? 365, s.L));
  const offset = s.L - slice.length;
  const lp = linePath(down(slice, 140), 1000, 280, 24);
  const first = slice[0] ?? s.price;
  const last = slice[slice.length - 1] ?? s.price;
  const color = last >= first ? 'var(--accent)' : 'var(--neg)';
  const dateOf = (i: number) => new Date(TODAY - (s.L - 1 - i) * DAY).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
  const point = hover === null ? null : lp.pts[Math.round(hover * (lp.pts.length - 1))] ?? null;

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHover(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
  };

  return (
    <section aria-labelledby="history-title" className="card" style={{ marginTop: 'clamp(32px,5vw,56px)', padding: 'clamp(18px,2.4vw,28px)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: 18 }}>
        <div>
          <h2 id="history-title" className="mono" style={{ margin: 0, fontSize: 11.5, fontWeight: 400, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', display: 'flex', gap: 8, alignItems: 'center' }}>
            Price history · {point ? dateOf(offset + point.i) : 'Market value today'}
            <Badge tone="neutral" title="Simulated demo market data until real sales accumulate" style={{ fontSize: 9.5 }}>
              DEMO
            </Badge>
          </h2>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 6 }}>
            <span className="mono" style={{ fontSize: 'clamp(26px,3vw,36px)', fontWeight: 700 }}>
              {money(point ? point.v : s.price)}
            </span>
            <span className="mono" style={{ fontSize: 14, fontWeight: 600, color }}>
              {pct(((last - first) / first) * 100)}
            </span>
          </div>
        </div>
        <Segmented mono label="Range" value={range} onChange={(r) => (setRange(r), setHover(null))} options={(['1M', '3M', '6M', '1Y', 'ALL'] as Range[]).map((r) => ({ value: r, label: r }))} />
      </div>
      <div style={{ position: 'relative', height: 'clamp(200px,28vw,300px)' }}>
        <svg viewBox="0 0 1000 280" preserveAspectRatio="none" role="img" aria-label={`Price history over ${range}: from ${money(first)} to ${money(last)}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
          <defs>
            <linearGradient id="kvArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity="0.26" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={lp.area} fill="url(#kvArea)" />
          <path d={lp.d} fill="none" stroke={color} strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>
        <div className="mono" aria-hidden="true" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '12px 0', pointerEvents: 'none', fontSize: 11, color: 'var(--muted)' }}>
          <span style={{ background: 'var(--surface)', paddingLeft: 6 }}>{money(lp.mx)}</span>
          <span style={{ background: 'var(--surface)', paddingLeft: 6 }}>{money(lp.mn)}</span>
        </div>
        {point && (
          <>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: point.x / 10 + '%', width: 1, background: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', left: point.x / 10 + '%', top: (point.y / 280) * 100 + '%', width: 12, height: 12, margin: '-6px 0 0 -6px', borderRadius: '50%', background: color, boxShadow: '0 0 0 5px rgba(75,255,139,0.2)', pointerEvents: 'none' }} />
          </>
        )}
        <div onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)} style={{ position: 'absolute', inset: 0, cursor: 'crosshair', touchAction: 'pan-y' }} />
      </div>
      <div className="mono" aria-hidden="true" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11, color: 'var(--faint)' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <span key={t}>{dateOf(offset + Math.round(t * (slice.length - 1)))}</span>
        ))}
      </div>
    </section>
  );
}
