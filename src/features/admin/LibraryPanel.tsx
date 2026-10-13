// Kit library: check members' suggestions, and import kits Maillot is
// allowed to use (a JSON array: {club, season, kind, brand?, sponsor?,
// pattern?, colors[], note?}; club = kit_clubs.id, e.g. "arsenal").
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import type { Json } from '../../types/database.ts';
import { Button, Card, ErrorState, SectionHeader, ShirtGraphic } from '../../ui/index.ts';
import { kitLook } from '../library/model.ts';

export function LibraryPanel() {
  const toast = useToast();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['adminKitSuggestions'], queryFn: db.loadKitSuggestions });
  const review = useMutation({
    mutationFn: ({ id, ok }: { id: string; ok: boolean }) => db.reviewKit(id, ok),
    onSuccess: (_r, v) => {
      toast(v.ok ? 'Added to the library' : 'Suggestion rejected');
      qc.invalidateQueries({ queryKey: ['adminKitSuggestions'] });
    },
    onError: (e: Error) => toast('Error: ' + e.message)
  });
  const [json, setJson] = useState('');
  const run = useMutation({
    mutationFn: () => db.importKits(JSON.parse(json) as Json),
    onSuccess: (n) => {
      toast(`${n} kits imported`);
      setJson('');
    },
    onError: (e: Error) => toast('Import failed: ' + e.message)
  });
  return (
    <section aria-labelledby="library-title" style={{ marginTop: 48 }}>
      <SectionHeader id="library-title" eyebrow="Kit library" title="Suggestions and import" size="sm" />
      {list.isError && <ErrorState compact what="suggestions" onRetry={() => list.refetch()} />}
      {list.data && !list.data.length && <p style={{ color: 'var(--muted)', fontSize: 14 }}>No suggestions waiting.</p>}
      <div style={{ display: 'grid', gap: 8 }}>
        {(list.data ?? []).map((k) => (
          <Card key={k.id} tight style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ width: 56, aspectRatio: '1/1', borderRadius: 10, background: 'var(--sunken)', display: 'grid', placeItems: 'center' }}>
              <ShirtGraphic {...kitLook(k.pattern, k.colors)} flat style={{ width: '80%' }} />
            </div>
            <div style={{ flex: '1 1 220px', fontSize: 13.5 }}>
              <strong>{k.club}</strong> · {k.season} · {k.kind}
              <div style={{ color: 'var(--muted)' }}>{[k.brand, k.sponsor, k.pattern, k.note].filter(Boolean).join(' · ')}</div>
            </div>
            <Button size="sm" onClick={() => review.mutate({ id: k.id, ok: true })}>
              Approve
            </Button>
            <Button size="sm" variant="ghost" onClick={() => review.mutate({ id: k.id, ok: false })}>
              Reject
            </Button>
          </Card>
        ))}
      </div>
      <Card style={{ marginTop: 14, padding: 16, borderRadius: 16 }}>
        <label htmlFor="kit-import" style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
          Import kits (JSON array) — only data Maillot may use
        </label>
        <textarea id="kit-import" value={json} onChange={(e) => setJson(e.target.value)} rows={5} spellCheck={false} placeholder='[{"club":"arsenal","season":"2004/05","kind":"home","brand":"Nike","sponsor":"O2","pattern":"plain","colors":["#EF0107","#FFFFFF"]}]' style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: 12.5, padding: 10, borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--text)' }} />
        <Button size="sm" style={{ marginTop: 10 }} disabled={!json.trim()} busy={run.isPending} onClick={() => run.mutate()}>
          Import
        </Button>
      </Card>
    </section>
  );
}
