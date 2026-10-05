import { useState } from 'react';
import { Link } from 'react-router';
import { pct } from '../../data.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { SectionHeader, Segmented, ShirtGraphic, alpha } from '../../ui/index.ts';
import { movers } from '../catalog/model.ts';

export function Movers() {
  const [dir, setDir] = useState<'up' | 'down'>('up');
  const { money } = usePrefs();
  return (
    <section aria-labelledby="movers-title" style={{ maxWidth: 1360, margin: '0 auto', padding: 'clamp(56px,7vw,100px) var(--gutter) 0' }}>
      <SectionHeader
        id="movers-title"
        eyebrow="30-day change"
        title="Biggest movers"
        action={<Segmented label="Direction" value={dir} onChange={setDir} options={[{ value: 'up', label: 'Gainers' }, { value: 'down', label: 'Losers' }]} />}
      />
      <ol style={{ listStyle: 'none', margin: 0, padding: '8px 0 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,420px),1fr))', gap: '4px 28px', borderTop: '1px solid var(--line)' }}>
        {movers(dir).map((m, i) => (
          <li key={m.id}>
            <Link to={'/shirt/' + m.id} className="row-btn" style={{ gap: 14, padding: 12, borderRadius: 14 }}>
              <span className="mono" style={{ fontSize: 12, color: 'var(--faint)', width: 20 }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span style={{ width: 56, height: 56, borderRadius: 12, background: `radial-gradient(circle,${alpha(m.glow, 0.34)},rgba(0,0,0,0) 72%),var(--sunken)`, display: 'grid', placeItems: 'center', flex: 'none' }}>
                <ShirtGraphic pat={m.pat} trim={m.trim} crest={m.crest} flat style={{ width: '78%' }} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</span>
                <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>
                  {m.brand} · {m.league}
                </span>
              </span>
              <svg className="hide-mobile" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true" style={{ width: 84, height: 30, flex: 'none' }}>
                <path d={m.spark} fill="none" stroke={m.ch >= 0 ? 'var(--accent)' : 'var(--neg)'} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
              </svg>
              <span style={{ textAlign: 'right', flex: 'none' }}>
                <span className="mono" style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>
                  {money(m.price)}
                </span>
                <span className="mono" style={{ display: 'block', fontSize: 12.5, color: m.ch >= 0 ? 'var(--accent)' : 'var(--neg)', marginTop: 3 }}>
                  {pct(m.ch)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
