// Collector search for the market search box (search_collectors), queried
// once typing pauses.
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as db from '../../utils/db.ts';

/** The query once typing pauses, so each keystroke doesn't hit the database. */
function useSettled(value: string, ms = 250) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return settled;
}

/** Collectors for a search query (none below two characters). */
export function useCollectorSearch(q: string): db.CollectorHit[] {
  const term = useSettled(q.trim().replace(/^@/, ''));
  const hits = useQuery({ queryKey: ['collectors', term.toLowerCase()], queryFn: () => db.searchCollectors(term), enabled: term.length >= 2, staleTime: 60_000 });
  return term.length >= 2 ? (hits.data ?? []) : [];
}
