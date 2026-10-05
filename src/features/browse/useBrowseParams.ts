// Browse state lives in the URL (?q=&type=Retro&league=…&min=&max=&sort=),
// so every search and filter combination is a shareable, indexable link and
// Back/Forward step through filter changes.
import { useSearchParams } from 'react-router';
import { EMPTY_FILTERS, FILTER_KEYS, PRICE_MAX, type BrowseQuery, type FilterKey, type Filters, type SortKey } from '../catalog/model.ts';

const SORT_KEYS: SortKey[] = ['trending', 'gain', 'newest', 'asc', 'desc'];

export function useBrowseParams() {
  const [params, setParams] = useSearchParams();
  const filters: Filters = { ...EMPTY_FILTERS };
  for (const k of FILTER_KEYS) filters[k] = params.getAll(k);
  const sortParam = params.get('sort') as SortKey | null;
  const query: BrowseQuery = {
    q: params.get('q') || '',
    filters,
    min: Number(params.get('min')) || 0,
    max: Math.min(PRICE_MAX, Number(params.get('max')) || PRICE_MAX),
    sort: sortParam && SORT_KEYS.includes(sortParam) ? sortParam : 'trending'
  };

  const update = (fn: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(params);
    fn(next);
    setParams(next, { replace: true });
  };

  return {
    query,
    setQ: (q: string) => update((p) => (q ? p.set('q', q) : p.delete('q'))),
    setSort: (s: SortKey) => update((p) => (s === 'trending' ? p.delete('sort') : p.set('sort', s))),
    toggle: (k: FilterKey, v: string) =>
      update((p) => {
        const cur = p.getAll(k);
        p.delete(k);
        (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]).forEach((x) => p.append(k, x));
      }),
    setRange: (min: number, max: number) =>
      update((p) => {
        if (min > 0) p.set('min', String(min));
        else p.delete('min');
        if (max < PRICE_MAX) p.set('max', String(max));
        else p.delete('max');
      }),
    clear: () => setParams(new URLSearchParams(), { replace: true })
  };
}
