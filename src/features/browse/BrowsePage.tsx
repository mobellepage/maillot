import { useState } from 'react';
import { useCatalog } from '../catalog/useCatalog.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { Button, ButtonLink, Dialog, EmptyState, GridIcon, ListIcon, Page, SearchField } from '../../ui/index.ts';
import { loadJSON, saveJSON } from '../../utils/storage.ts';
import { SHIRTS } from '../../data.ts';
import { browse, FILTER_KEYS, PRICE_MAX, SORTS, type FilterKey, type SortKey } from '../catalog/model.ts';
import { ShirtGrid, ShirtList } from '../catalog/ShirtGrid.tsx';
import { FilterPanel } from './FilterPanel.tsx';
import { useBrowseParams } from './useBrowseParams.ts';
import { CollectorResults } from '../collectors/CollectorResults.tsx';
import { useCollectorSearch } from '../collectors/useCollectorSearch.ts';

type Quick = { label: string } & ({ kind: 'filter'; key: FilterKey; value: string } | { kind: 'range'; max: number });
const QUICK: Quick[] = [
  { label: 'filter.q.retro', kind: 'filter', key: 'type', value: 'Retro' },
  { label: 'filter.q.new', kind: 'filter', key: 'type', value: 'New' },
  { label: 'filter.q.matchWorn', kind: 'filter', key: 'type', value: 'Match-worn' },
  { label: 'filter.q.national', kind: 'filter', key: 'league', value: 'National Teams' },
  { label: 'filter.q.ssl', kind: 'filter', key: 'league', value: 'Swiss Super League' },
  { label: 'filter.q.under', kind: 'range', max: 120 }
];

export default function BrowsePage() {
  useCatalog(); // re-render when the live catalogue loads
  const { query, setQ, setSort, toggle, setRange, clear } = useBrowseParams();
  const { money, t, label } = usePrefs();
  const [showFilters, setShowFilters] = useState(false);
  // Big cards make you want the shirt; a list lets you compare. People choose.
  const [view, setViewState] = useState<'grid' | 'list'>(() => (loadJSON<string>('kv_browse_view', 'grid') === 'list' ? 'list' : 'grid'));
  const setView = (v: 'grid' | 'list') => {
    setViewState(v);
    saveJSON('kv_browse_view', v);
  };
  const results = browse(query);
  const collectors = useCollectorSearch(query.q);
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
          <select className="select" aria-label={t('sort.aria')} value={query.sort} onChange={(e) => setSort(e.target.value as SortKey)} style={{ flex: '1 1 150px', minWidth: 0, maxWidth: 260 }}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {t('sort.label', { label: t(s.label) })}
              </option>
            ))}
          </select>
          <div role="group" aria-label={t('browse.view')} className="segmented" style={{ height: 46, flex: 'none' }}>
            <button type="button" aria-pressed={view === 'grid'} aria-label={t('browse.viewGrid')} title={t('browse.viewGrid')} onClick={() => setView('grid')} style={{ display: 'grid', placeItems: 'center', padding: '0 12px' }}>
              <GridIcon />
            </button>
            <button type="button" aria-pressed={view === 'list'} aria-label={t('browse.viewList')} title={t('browse.viewList')} onClick={() => setView('list')} style={{ display: 'grid', placeItems: 'center', padding: '0 12px' }}>
              <ListIcon />
            </button>
          </div>
          <Button variant="secondary" size="sm" className="show-mobile" style={{ height: 46 }} aria-haspopup="dialog" onClick={() => setShowFilters(true)}>
            {t('filter.show') + (chips.length ? ` (${chips.length})` : '')}
          </Button>
        </div>
      </div>

      {/* Quick filters: one tap, no panel. */}
      <nav aria-label={t('filter.quick')} style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '-8px 0 18px', paddingBottom: 4, scrollbarWidth: 'none' }}>
        {QUICK.map((q) => {
          const on = q.kind === 'range' ? query.max === q.max && query.min === 0 : query.filters[q.key].includes(q.value);
          return (
            <button
              key={q.label}
              type="button"
              className={'chip' + (on ? ' chip--active' : '')}
              aria-pressed={on}
              style={{ flex: 'none' }}
              onClick={() => (q.kind === 'range' ? setRange(0, on ? PRICE_MAX : q.max) : toggle(q.key, q.value))}
            >
              {t(q.label, { price: money(q.kind === 'range' ? q.max : 0) })}
            </button>
          );
        })}
      </nav>

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
        <aside aria-label={t('filter.aria')} className="browse-filters">
          <FilterPanel query={query} toggle={toggle} setRange={setRange} />
        </aside>
        {/* Phones: the filters as a sheet over the results; the button says what you'll get. */}
        <Dialog open={showFilters} onClose={() => setShowFilters(false)} title={t('filter.show')}>
          <FilterPanel query={query} toggle={toggle} setRange={setRange} />
          <div style={{ position: 'sticky', bottom: -28, display: 'flex', gap: 10, alignItems: 'center', margin: '8px -28px -28px', padding: '14px 28px 20px', background: 'var(--surface-2)', borderTop: '1px solid var(--line)' }}>
            <button type="button" className="link-btn link-btn--muted" style={{ fontSize: 14, padding: 8, whiteSpace: 'nowrap', flex: 'none' }} onClick={clear} disabled={!chips.length}>
              {t('filter.clearAll')}
            </button>
            <Button block onClick={() => setShowFilters(false)} disabled={!results.length}>
              {results.length ? t('filter.showN', { n: results.length }) : t('filter.none')}
            </Button>
          </div>
        </Dialog>
        <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
          <CollectorResults hits={collectors} />
          {results.length ? (
            view === 'list' ? <ShirtList shirts={results} label={t('browse.results')} /> : <ShirtGrid shirts={results} label={t('browse.results')} />
          ) : collectors.length ? (
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>{t('browse.noShirtsForQuery', { q: query.q })}</p>
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
