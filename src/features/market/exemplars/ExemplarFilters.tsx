// The marketplace's filter panel: version, size, condition, value, league,
// club and verification — options taken from the shirts actually listed.
import { useState } from 'react';
import { usePrefs } from '../../../lib/prefs.tsx';
import { CheckIcon } from '../../../ui/index.ts';
import { CONDITION_BUCKETS, type Exemplar, type MarketFilters } from './model.ts';
import type { ListKey } from './useMarketParams.ts';
import { VERSIONS } from '../../../config/rules.ts';

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

export function ExemplarFilters({ list, f, toggle, setRange }: { list: Exemplar[]; f: MarketFilters; toggle: (k: ListKey, v: string) => void; setRange: (min: number | null, max: number | null) => void }) {
  const { t, label } = usePrefs();
  const [allClubs, setAllClubs] = useState(false);
  const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => !!x))];
  const clubs = uniq(list.map((e) => e.club)).sort();
  const groups: { key: ListKey; title: string; options: { value: string; label: string }[] }[] = [
    { key: 'versions', title: t('mx.f.version'), options: VERSIONS.map((v) => ({ value: v.key, label: t('mx.version.' + v.key) })) },
    { key: 'sizes', title: t('mx.f.size'), options: uniq(list.map((e) => e.size)).sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b)).map((v) => ({ value: v, label: v })) },
    { key: 'conditions', title: t('mx.f.condition'), options: CONDITION_BUCKETS.map((b) => ({ value: b.key, label: t('mx.cond.' + b.key) })) },
    { key: 'verification', title: t('mx.f.verification'), options: (['expert', 'precheck', 'self'] as const).map((v) => ({ value: v, label: t('mx.verify.' + v) })) },
    { key: 'leagues', title: t('mx.f.league'), options: uniq(list.map((e) => e.league)).sort().map((v) => ({ value: v, label: label('league', v) })) },
    { key: 'clubs', title: t('mx.f.club'), options: (allClubs ? clubs : clubs.slice(0, 8)).map((v) => ({ value: v, label: v })) }
  ];
  const sel: Record<ListKey, string[]> = { versions: f.versions, sizes: f.sizes, conditions: f.conditions, leagues: f.leagues, clubs: f.clubs, verification: f.verification };
  const field = { width: '100%', height: 40, padding: '0 10px', borderRadius: 10, background: 'var(--sunken)', border: '1px solid var(--line)', color: 'var(--text)', font: 'inherit', fontSize: 14 } as const;
  return (
    <div>
      {groups.map((g) => (
        <fieldset key={g.key} style={{ border: 0, margin: 0, padding: '16px 0', borderBottom: '1px solid var(--line)' }}>
          <legend className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10, padding: 0 }}>
            {g.title}
          </legend>
          {g.options.map((o) => {
            const on = sel[g.key].includes(o.value);
            return (
              <label key={o.value} className="row-btn" style={{ gap: 10, padding: '7px 6px', borderRadius: 8, color: on ? 'var(--text)' : 'var(--text-2)', fontSize: 14 }}>
                <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(g.key, o.value)} />
                <span aria-hidden="true" style={{ width: 17, height: 17, borderRadius: 5, border: `1.5px solid ${on ? 'var(--accent)' : 'var(--line-strong)'}`, background: on ? 'var(--accent)' : 'transparent', display: 'grid', placeItems: 'center', color: 'var(--bg)', flex: 'none' }}>
                  {on && <CheckIcon size={11} />}
                </span>
                <span style={{ flex: 1 }}>{o.label}</span>
              </label>
            );
          })}
          {g.key === 'clubs' && clubs.length > 8 && (
            <button type="button" className="link-btn" style={{ fontSize: 13, marginTop: 6 }} onClick={() => setAllClubs(!allClubs)}>
              {allClubs ? t('filter.showFewer') : t('filter.showAllClubs', { n: clubs.length })}
            </button>
          )}
        </fieldset>
      ))}
      <fieldset style={{ border: 0, margin: 0, padding: '16px 0' }}>
        <legend className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10, padding: 0 }}>
          {t('mx.f.value')}
        </legend>
        <div style={{ display: 'flex', gap: 8 }}>
          <input aria-label={t('mx.f.min')} placeholder={t('mx.f.min')} inputMode="numeric" defaultValue={f.min ?? ''} onBlur={(e) => setRange(e.target.value ? Number(e.target.value.replace(/\D/g, '')) : null, f.max)} style={field} />
          <input aria-label={t('mx.f.max')} placeholder={t('mx.f.max')} inputMode="numeric" defaultValue={f.max ?? ''} onBlur={(e) => setRange(f.min, e.target.value ? Number(e.target.value.replace(/\D/g, '')) : null)} style={field} />
        </div>
      </fieldset>
    </div>
  );
}
