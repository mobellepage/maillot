// Dealers: shops selling on Maillot. Mark a member as a verified dealer and
// set their commission rate (pilot terms); clear both to make them a regular
// seller again. Rates apply to sales matched from now on.
import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import { Button, Card, ErrorState, SectionHeader, TextField } from '../../ui/index.ts';

export function DealersPanel() {
  const toast = useToast();
  const qc = useQueryClient();
  const dealers = useQuery({ queryKey: ['adminDealers'], queryFn: db.loadDealers });
  const [handle, setHandle] = useState('');
  const [rate, setRate] = useState('5');
  const pct = rate.trim() === '' ? null : Number(rate.replace(',', '.'));
  const valid = handle.trim().length >= 3 && (pct === null || (Number.isFinite(pct) && pct >= 0 && pct <= 30));
  const save = useMutation({
    mutationFn: (verified: boolean) => db.setDealer(handle.trim().replace(/^@/, ''), verified, verified && pct !== null ? pct / 100 : null),
    onSuccess: (_r, verified) => {
      toast(verified ? `@${handle.trim().replace(/^@/, '')} is a verified dealer` : 'Dealer status removed');
      qc.invalidateQueries({ queryKey: ['adminDealers'] });
    },
    onError: (e: Error) => toast('Error: ' + e.message)
  });
  return (
    <section aria-labelledby="dealers-title" style={{ marginTop: 48 }}>
      <SectionHeader id="dealers-title" eyebrow="Partners" title="Dealers" size="sm" />
      <Card style={{ padding: 18, borderRadius: 16, display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <TextField label="Username" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@shop" spellCheck={false} style={{ flex: '1 1 200px' }} />
          <TextField label="Commission (%)" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="8 (standard)" hint="Empty = standard 8 %" style={{ flex: '0 1 150px' }} />
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button size="sm" disabled={!valid} busy={save.isPending && save.variables === true} onClick={() => save.mutate(true)}>
            Make verified dealer
          </Button>
          <Button size="sm" variant="ghost" disabled={handle.trim().length < 3} busy={save.isPending && save.variables === false} onClick={() => save.mutate(false)}>
            Remove dealer status
          </Button>
        </div>
      </Card>
      {dealers.isError && <ErrorState compact what="dealers" onRetry={() => dealers.refetch()} />}
      <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
        {(dealers.data ?? []).map((d) => (
          <Card key={d.handle} tight style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: 13.5 }}>
            <Link to={'/u/' + d.handle}>@{d.handle}</Link>
            <span className="mono" style={{ color: 'var(--text-2)' }}>
              {d.commission_rate === null ? 'standard 8 %' : Math.round(Number(d.commission_rate) * 1000) / 10 + ' %'} · {d.listings} listings · {d.sales} sales
              {d.dealer_verified_at ? '' : ' · not verified'}
            </span>
          </Card>
        ))}
      </div>
    </section>
  );
}
