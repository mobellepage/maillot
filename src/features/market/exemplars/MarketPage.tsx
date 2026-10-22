// /market: the shirts in members' collections — for sale, open to offers,
// or collector's pieces — never catalogue models (those are the library,
// /library/catalog). Buyable ones by default; "all in collections" shows
// the rest too, buyable first. Demo shirts fill it until launch, marked.
import { useState } from 'react';
import { Link } from 'react-router';
import { MARKET_FEW_OFFERS } from '../../../config/rules.ts';
import { BY } from '../../../data.ts';
import { usePageMeta } from '../../../lib/meta.ts';
import { usePrefs } from '../../../lib/prefs.tsx';
import { usePhotoUrls } from '../../../lib/usePhotoUrls.ts';
import { Button, Dialog, EmptyState, Notice, Page, SearchField, Segmented } from '../../../ui/index.ts';
import { CollectorResults } from '../../collectors/CollectorResults.tsx';
import { useCollectorSearch } from '../../collectors/useCollectorSearch.ts';
import { ExemplarCard } from './ExemplarCard.tsx';
import { ExemplarFilters } from './ExemplarFilters.tsx';
import { counts, filterExemplars, isBuyable, sortExemplars } from './model.ts';
import { LIST_KEYS, useMarketParams } from './useMarketParams.ts';
import { useExemplars } from './useExemplars.ts';
import { useFantasyEvent } from '../../fantasy/useFantasy.ts';

export default function MarketPage() {
  const { t, money } = usePrefs();
  useFantasyEvent('visit_market');
  const { list, error, retry } = useExemplars();
  const { f, setStatus, setQ, toggle, setRange, clear, clearShirt } = useMarketParams();
  const [showFilters, setShowFilters] = useState(false);
  const results = sortExemplars(filterExemplars(list, f));
  // When nothing is to buy, how many are there in collections?
  const elsewhere = f.status === 'buyable' && !results.length ? filterExemplars(list, { ...f, status: 'all' }).length : 0;
  const all = counts(list);
  const realBuyable = list.filter((e) => !e.demo && isBuyable(e)).length;
  const url = usePhotoUrls(results.map((e) => e.photo), true);
  const collectors = useCollectorSearch(f.q);
  usePageMeta(t('mx.metaTitle'), t('mx.metaDesc', { n: all.total, b: all.buyable }));

  const active = LIST_KEYS.reduce((n, k) => n + (f[k] as string[]).length, 0) + (f.min !== null || f.max !== null ? 1 : 0);
  const shirt = f.shirt ? BY[f.shirt] : undefined;
  const filters = <ExemplarFilters list={list} f={f} toggle={toggle} setRange={setRange} />;

  return (
    <Page>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 20 }}>
        <div>
          <div className="eyebrow">{t('mx.eyebrow')}</div>
          <h1 className="display display--lg" style={{ margin: '8px 0 6px' }}>
            {t('mx.title')}
          </h1>
          <div role="status" style={{ fontSize: 13.5, color: 'var(--muted)' }}>
            {t('mx.count', { n: all.total, b: all.buyable })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flex: '1 1 360px', justifyContent: 'flex-end', alignItems: 'center' }}>
          <SearchField key={f.q === '' ? 'empty' : 'q'} srLabel={t('browse.searchLabel')} placeholder={t('browse.searchPlaceholder')} defaultValue={f.q} onChange={(e) => setQ(e.target.value)} style={{ flex: '1 1 220px', maxWidth: 360 }} />
          <Segmented label={t('mx.f.status')} value={f.status} onChange={setStatus} options={[{ value: 'buyable', label: t('mx.buyable') }, { value: 'all', label: t('mx.allInCollections') }]} />
          <Button variant="secondary" size="sm" className="show-mobile" style={{ height: 46 }} aria-haspopup="dialog" onClick={() => setShowFilters(true)}>
            {t('filter.show') + (active ? ` (${active})` : '')}
          </Button>
        </div>
      </div>

      {realBuyable < MARKET_FEW_OFFERS && (
        <Notice tone="info" style={{ marginBottom: 18 }}>
          <span>
            {t('mx.few')} <Link to="/library">{t('mx.toLibrary')}</Link> · <Link to="/watchlist">{t('mx.toWishlist')}</Link>
          </span>
        </Notice>
      )}

      {(shirt || active > 0 || f.q) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 18 }}>
          {shirt && (
            <button type="button" className="chip chip--active" onClick={clearShirt} aria-label={t('filter.remove', { label: shirt.name })}>
              {shirt.name}
              <span aria-hidden="true" style={{ color: 'var(--accent)', fontSize: 15, lineHeight: 1 }}>
                ×
              </span>
            </button>
          )}
          {(f.min !== null || f.max !== null) && <span className="chip chip--active">{(f.min !== null ? money(f.min) : '…') + ' – ' + (f.max !== null ? money(f.max) : '…')}</span>}
          <button type="button" className="link-btn link-btn--muted" style={{ fontSize: 13, textDecoration: 'underline', padding: 6 }} onClick={clear}>
            {t('filter.clearAll')}
          </button>
        </div>
      )}

      <div className="browse-layout">
        <aside aria-label={t('filter.aria')} className="browse-filters">
          {filters}
        </aside>
        <Dialog open={showFilters} onClose={() => setShowFilters(false)} title={t('filter.show')}>
          {filters}
          <div style={{ position: 'sticky', bottom: -28, display: 'flex', gap: 10, alignItems: 'center', margin: '8px -28px -28px', padding: '14px 28px 20px', background: 'var(--surface-2)', borderTop: '1px solid var(--line)' }}>
            <button type="button" className="link-btn link-btn--muted" style={{ fontSize: 14, padding: 8, whiteSpace: 'nowrap', flex: 'none' }} onClick={clear} disabled={!active}>
              {t('filter.clearAll')}
            </button>
            <Button block onClick={() => setShowFilters(false)} disabled={!results.length}>
              {results.length ? t('mx.showN', { n: results.length }) : t('filter.none')}
            </Button>
          </div>
        </Dialog>
        <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
          <CollectorResults hits={collectors} />
          {error && (
            <Notice tone="warn" style={{ marginBottom: 14 }}>
              {t('mx.loadFailed')}{' '}
              <button type="button" className="link-btn" onClick={retry}>
                {t('common.tryAgain')}
              </button>
            </Notice>
          )}
          {results.length ? (
            <ul aria-label={t('browse.results')} className="grid-cards" style={{ listStyle: 'none', padding: 0, margin: 0, gridTemplateColumns: 'repeat(auto-fill,minmax(min(46%,210px),1fr))' }}>
              {results.map((e) => (
                <ExemplarCard key={e.id} e={e} src={url(e.photo)} />
              ))}
            </ul>
          ) : (
            <EmptyState
              title={t('mx.empty')}
              action={
                <>
                  {elsewhere > 0 && (
                    <Button variant="secondary" size="sm" onClick={() => setStatus('all')}>
                      {t('mx.showAllN', { n: elsewhere })}
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={clear}>
                    {t('browse.clearFilters')}
                  </Button>
                </>
              }
            >
              {elsewhere > 0 ? t('mx.emptyNotBuyable', { n: elsewhere }) : t('mx.emptyBody')}
            </EmptyState>
          )}
        </div>
      </div>
    </Page>
  );
}
