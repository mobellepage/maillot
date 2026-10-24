// The marketplace's exemplars: real ones from every collection that isn't
// private, plus the demo ones while config/rules.ts SHOW_DEMO_EXEMPLARS is on.
import { useQuery } from '@tanstack/react-query';
import { SHOW_DEMO_EXEMPLARS } from '../../../config/rules.ts';
import { useCatalog } from '../../catalog/useCatalog.ts';
import * as db from '../../../utils/db.ts';
import { demoExemplars, fromRow, type Exemplar } from './model.ts';
import { useBlocks } from '../../moderation/useBlocks.ts';

export function useExemplars(): { list: Exemplar[]; loading: boolean; error: boolean; retry: () => void } {
  useCatalog(); // names and values come from the live catalogue
  const q = useQuery({ queryKey: ['marketExemplars'], queryFn: db.loadMarketExemplars, staleTime: 60_000 });
  const real = (q.data ?? []).map(fromRow);
  const blocks = useBlocks();
  return { list: blocks.visible(SHOW_DEMO_EXEMPLARS ? [...real, ...demoExemplars()] : real, (e) => e.owner), loading: q.isLoading, error: q.isError, retry: () => void q.refetch() };
}
