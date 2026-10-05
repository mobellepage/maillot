import { useState } from 'react';
import { usePrefs } from '../../lib/prefs.tsx';
import { CheckIcon } from '../../ui/index.ts';
import { filterGroups, PRICE_MAX, type BrowseQuery, type FilterKey } from '../catalog/model.ts';

const GROUPS = filterGroups();

export function FilterPanel({ query, toggle, setRange }: { query: BrowseQuery; toggle: (k: FilterKey, v: string) => void; setRange: (min: number, max: number) => void }) {
  const { money, t, label } = usePrefs();
  const [allClubs, setAllClubs] = useState(false);
  return (
    <div>
      {GROUPS.map((g) => {
        const shown = g.key === 'club' && !allClubs ? g.options.slice(0, 6) : g.options;
        return (
          <fieldset key={g.key} style={{ border: 0, margin: 0, padding: '16px 0', borderBottom: '1px solid var(--line)' }}>
            <legend className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10, padding: 0 }}>
              {t(g.title)}
            </legend>
            {shown.map((o) => {
              const on = query.filters[g.key].includes(o.value);
              return (
                <label key={o.value} className="row-btn" style={{ gap: 10, padding: '7px 6px', borderRadius: 8, color: on ? 'var(--text)' : 'var(--text-2)', fontSize: 14 }}>
                  <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(g.key, o.value)} />
                  <span aria-hidden="true" style={{ width: 17, height: 17, borderRadius: 5, border: `1.5px solid ${on ? 'var(--accent)' : 'rgba(255,255,255,0.22)'}`, background: on ? 'var(--accent)' : 'transparent', display: 'grid', placeItems: 'center', color: 'var(--bg)', flex: 'none' }}>
                    {on && <CheckIcon size={11} />}
                  </span>
                  <span style={{ flex: 1 }}>{g.key === 'type' || g.key === 'league' ? label(g.key, o.value) : g.key === 'condition' ? label('cond', o.value) : o.value}</span>
                  <span className="mono" style={{ fontSize: 11.5, color: 'var(--faint)' }}>
                    {o.count}
                  </span>
                </label>
              );
            })}
            {g.key === 'club' && (
              <button type="button" className="link-btn" style={{ padding: '8px 6px 0', fontSize: 13, fontWeight: 500 }} onClick={() => setAllClubs(!allClubs)}>
                {allClubs ? t('filter.showFewer') : t('filter.showAllClubs', { n: g.options.length })}
              </button>
            )}
          </fieldset>
        );
      })}
      <fieldset style={{ border: 0, margin: 0, padding: '16px 0 8px' }}>
        <legend className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10, padding: 0 }}>
          {t('common.marketValue')}
        </legend>
        <div className="mono" style={{ fontSize: 14, marginBottom: 12 }}>
          {money(query.min)} – {money(query.max)}
          {query.max >= PRICE_MAX ? '+' : ''}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {t('filter.min')}
            <input type="range" min={0} max={PRICE_MAX} step={10} value={query.min} onChange={(e) => setRange(Math.min(+e.target.value, query.max - 10), query.max)} style={{ flex: 1 }} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {t('filter.max')}
            <input type="range" min={0} max={PRICE_MAX} step={10} value={query.max} onChange={(e) => setRange(query.min, Math.max(+e.target.value, query.min + 10))} style={{ flex: 1 }} />
          </label>
        </div>
      </fieldset>
    </div>
  );
}
