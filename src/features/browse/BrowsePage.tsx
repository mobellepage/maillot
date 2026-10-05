import { useState } from 'react';
import { useCatalog } from '../catalog/useCatalog.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { Button, ButtonLink, EmptyState, Page, SearchField } from '../../ui/index.ts';
import { SHIRTS } from '../../data.ts';
import { browse, FILTER_KEYS, PRICE_MAX, SORTS, type SortKey } from '../catalog/model.ts';
import { ShirtGrid } from '../catalog/ShirtGrid.tsx';
import { FilterPanel } from './FilterPanel.tsx';
import { useBrowseParams } from './useBrowseParams.ts';

export default function BrowsePage() {
  useCatalog(); // re-render when the live catalogue loads
  const { query, setQ, setSort, toggle, setRange, clear } = useBrowseParams();
  const { money, t, label } = usePrefs();
  const [showFilters, setShowFilters] = useState(false);
  const results = browse(query);
  usePageMeta(query.q ? t('browse.metaSearch', { q: query.q }) : t('browse.metaTitle'), t('browse.metaDesc', { n: SHIRTS.length }));

  const chips: { label: string; rm: () => void }[] = [];
  if (query.q) chips.push({ label: '“' + query.q + '”', rm: () => setQ('') });
  for (const k of FILTER_KEYS) for (const v of query.filters[k]) chips.push({ label: k === 'type' || k === 'league' ? label(k, v) : k === 'condition' ? label('cond', v) : v, rm: () => toggle(k, v) });
  if (query.min > 0 || query.max < PRICE_MAX) chips.push({ label: money(query.min) + ' – ' + money(query.max), rm: () => setRange(0, PRICE_MAX) });

  return (
    <Page>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 24 }}>
        <div>
          <div className="eyebrow">{t('browse.eyebrow')}</div>
          <h1 className="display display--lg" style={{ margin: '8px 0 6px' }}>
            {t('browse.title')}
          </h1>
          <div role="status" style={{ fontSize: 13.5, color: 'var(--muted)' }}>
            {t('browse.count', { n: results.length, total: SHIRTS.length })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flex: '1 1 360px', justifyContent: 'flex-end' }}>
          <SearchField key={query.q === '' ? 'empty' : 'q'} srLabel={t('browse.searchLabel')} placeholder={t('browse.searchPlaceholder')} defaultValue={query.q} onChange={(e) => setQ(e.target.value)} style={{ flex: '1 1 220px', maxWidth: 360 }} />
          <select className="select" aria-label={t('sort.aria')} value={query.sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {t('sort.label', { label: t(s.label) })}
              </option>
            ))}
          </select>
          <Button variant="secondary" size="sm" className="show-mobile" style={{ height: 46 }} aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)}>
            {(showFilters ? t('filter.hide') : t('filter.show')) + (chips.length ? ` (${chips.length})` : '')}
          </Button>
        </div>
      </div>

      {chips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 20 }}>
          {chips.map((c) => (
            <button key={c.label} type="button" className="chip chip--active" onClick={c.rm} aria-label={t('filter.remove', { label: c.label })}>
              {c.label}
              <span aria-hidden="true" style={{ color: 'var(--accent)', fontSize: 15, lineHeight: 1 }}>
                ×
              </span>
            </button>
          ))}
          <button type="button" className="link-btn link-btn--muted" style={{ fontSize: 13, textDecoration: 'underline', padding: 6 }} onClick={clear}>
            {t('filter.clearAll')}
          </button>
        </div>
      )}

      <div className="browse-layout">
        <aside aria-label={t('filter.aria')} className={'browse-filters' + (showFilters ? ' is-open' : '')}>
          <FilterPanel query={query} toggle={toggle} setRange={setRange} />
        </aside>
        <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
          {results.length ? (
            <ShirtGrid shirts={results} label={t('browse.results')} />
          ) : (
            <EmptyState
              title={t('browse.empty')}
              action={
                <>
                  <Button variant="ghost" size="sm" onClick={clear}>
                    {t('browse.clearFilters')}
                  </Button>
                  <ButtonLink to="/sell" size="sm">
                    {t('browse.listShirt')}
                  </ButtonLink>
                </>
              }
            >
              {t('browse.emptyBody')}
            </EmptyState>
          )}
        </div>
      </div>
    </Page>
  );
}
