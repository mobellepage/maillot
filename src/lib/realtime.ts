// Supabase Realtime → TanStack Query. Subscribes to row changes on a table
// (optionally filtered) and invalidates the given queries, so screens update
// the moment the database does — no polling. RLS still applies: a user only
// receives changes to rows they're allowed to read.
import { useEffect, useRef } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { sb } from '../utils/supabase.ts';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface LiveSource {
  table: string;
  /** PostgREST-style filter, e.g. "user_id=eq.<uuid>" */
  filter?: string;
}

let seq = 0;

export function useLive(sources: LiveSource[], keys: QueryKey[], enabled = true, onChange?: () => void) {
  const qc = useQueryClient();
  const latest = useRef({ keys, onChange });
  useEffect(() => {
    latest.current = { keys, onChange };
  });
  const signature = sources.map((s) => s.table + ':' + (s.filter || '')).join('|');

  useEffect(() => {
    if (!enabled || !sources.length) return;
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    sb().then((client) => {
      if (cancelled) return;
      const ch = client.channel('live-' + ++seq + '-' + signature);
      for (const s of sources) {
        ch.on('postgres_changes', { event: '*', schema: 'public', table: s.table, ...(s.filter ? { filter: s.filter } : {}) }, () => {
          latest.current.keys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
          latest.current.onChange?.();
        });
      }
      ch.subscribe();
      channel = ch;
    });
    return () => {
      cancelled = true;
      if (channel) sb().then((client) => client.removeChannel(channel!));
    };
    // signature captures sources; keys/onChange are read through the ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, signature, qc]);
}
