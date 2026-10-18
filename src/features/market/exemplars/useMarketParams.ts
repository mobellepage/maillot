// The marketplace's filters live in the URL, so results are shareable:
// status=all, q, shirt, version, size, cond, league, club, verify, min, max.
import { useSearchParams } from 'react-router';
import { NO_FILTERS, type MarketFilters } from './model.ts';

type ListKey = 'versions' | 'sizes' | 'conditions' | 'leagues' | 'clubs' | 'verification';
const PARAM: Record<ListKey, string> = { versions: 'version', sizes: 'size', conditions: 'cond', leagues: 'league', clubs: 'club', verification: 'verify' };
export const LIST_KEYS = Object.keys(PARAM) as ListKey[];
export type { ListKey };

const num = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : null);

export function useMarketParams() {
  const [params, setParams] = useSearchParams();
  const list = (k: ListKey) => (params.get(PARAM[k]) ?? '').split(',').filter(Boolean);
  const f: MarketFilters = {
    ...NO_FILTERS,
    status: params.get('status') === 'all' ? 'all' : 'buyable',
    q: params.get('q') ?? '',
    shirt: params.get('shirt'),
    versions: list('versions') as MarketFilters['versions'],
    sizes: list('sizes'),
    conditions: list('conditions') as MarketFilters['conditions'],
    leagues: list('leagues'),
    clubs: list('clubs'),
    verification: list('verification') as MarketFilters['verification'],
    min: num(params.get('min')),
    max: num(params.get('max'))
  };
  const update = (fn: (p: URLSearchParams) => void) =>
    setParams(
      (p) => {
        fn(p);
        return p;
      },
      { replace: true }
    );
  return {
    f,
    setStatus: (s: MarketFilters['status']) => update((p) => (s === 'all' ? p.set('status', 'all') : p.delete('status'))),
    setQ: (q: string) => update((p) => (q ? p.set('q', q) : p.delete('q'))),
    toggle: (k: ListKey, v: string) =>
      update((p) => {
        const cur = list(k);
        const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
        if (next.length) p.set(PARAM[k], next.join(','));
        else p.delete(PARAM[k]);
      }),
    setRange: (min: number | null, max: number | null) =>
      update((p) => {
        if (min !== null) p.set('min', String(min));
        else p.delete('min');
        if (max !== null) p.set('max', String(max));
        else p.delete('max');
      }),
    clearShirt: () => update((p) => p.delete('shirt')),
    clear: () =>
      update((p) => {
        for (const k of [...LIST_KEYS.map((x) => PARAM[x]), 'q', 'shirt', 'min', 'max']) p.delete(k);
      })
  };
}
