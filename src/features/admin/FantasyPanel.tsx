// Fantasy for admins: override a result and rescore,
// the clubs' prices, and the provider's team mappings.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import { Button, Card, SectionHeader } from '../../ui/index.ts';

export function FantasyPanel() {
  return (
    <section aria-labelledby="fantasy-admin-title" style={{ marginTop: 48 }}>
      <SectionHeader id="fantasy-admin-title" eyebrow="Fantasy" title="Results, prices, mappings" size="sm" />
      <div style={{ display: 'grid', gap: 14 }}>
        <Fixtures />
        <Prices />
        <TeamMappings />
      </div>
    </section>
  );
}

function Fixtures() {
  const toast = useToast();
  const qc = useQueryClient();
  const mds = useQuery({ queryKey: ['adminFantasyMds'], queryFn: db.adminMatchdays });
  const [md, setMd] = useState<number | null>(null);
  const fixtures = useQuery({ queryKey: ['fantasyFixtures', md], queryFn: () => db.loadFixtures(md!), enabled: !!md });
  const set = useMutation({
    mutationFn: ({ id, h, a }: { id: number; h: number; a: number }) => db.adminSetFixture(id, h, a),
    onSuccess: () => {
      toast('Result saved (kept on resync)');
      void qc.invalidateQueries({ queryKey: ['fantasyFixtures', md] });
    },
    onError: (e: Error) => toast('Error: ' + e.message)
  });
  const rescore = useMutation({ mutationFn: () => db.adminRescore(md!), onSuccess: () => toast('Rescored'), onError: (e: Error) => toast('Error: ' + e.message) });
  return (
    <Card tight>
      <b>Fixtures and results</b>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
        <select value={md ?? ''} onChange={(e) => setMd(Number(e.target.value) || null)} style={{ height: 36, borderRadius: 10, padding: '0 10px' }}>
          <option value="">Matchday …</option>
          {(mds.data ?? []).map((m) => (
            <option key={m.id} value={m.id}>
              MD {m.number} · {m.cup_name} · {m.status} · {m.fixtures} fixtures · {m.lineups} line-ups
            </option>
          ))}
        </select>
        {md && (
          <Button size="sm" variant="secondary" onClick={() => rescore.mutate()} busy={rescore.isPending}>
            Rescore
          </Button>
        )}
      </div>
      {md && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0', display: 'grid', gap: 4, maxHeight: 360, overflowY: 'auto' }}>
          {(fixtures.data ?? []).map((f) => (
            <li key={f.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto 1fr auto', gap: 6, alignItems: 'center', fontSize: 12.5 }}>
              <span style={{ textAlign: 'right' }}>{f.home_name}</span>
              <input type="number" min={0} max={20} defaultValue={f.home_goals ?? ''} id={'h' + f.id} style={{ width: 44, height: 30, textAlign: 'center' }} />
              <span>:</span>
              <input type="number" min={0} max={20} defaultValue={f.away_goals ?? ''} id={'a' + f.id} style={{ width: 44, height: 30, textAlign: 'center' }} />
              <span>
                {f.away_name} <small style={{ color: 'var(--muted)' }}>{f.status}</small>
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const h = Number((document.getElementById('h' + f.id) as HTMLInputElement).value);
                  const a = Number((document.getElementById('a' + f.id) as HTMLInputElement).value);
                  set.mutate({ id: f.id, h, a });
                }}
              >
                Set
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Prices() {
  const toast = useToast();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['adminFantasyPrices'], queryFn: db.adminClubPrices });
  const [q, setQ] = useState('');
  const set = useMutation({
    mutationFn: ({ club, price }: { club: string; price: number }) => db.adminSetPrice(club, price),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['adminFantasyPrices'] });
      void qc.invalidateQueries({ queryKey: ['fantasyJerseys'] });
    },
    onError: (e: Error) => toast('Error: ' + e.message)
  });
  const rows = (list.data ?? []).filter((m) => !q || (m.club_name ?? m.club_id).toLowerCase().includes(q.toLowerCase()) || (m.league ?? '').toLowerCase().includes(q.toLowerCase()));
  return (
    <Card tight>
      <b>Jersey prices</b> <small style={{ color: 'var(--muted)' }}>(in M; they move with form after every Gameweek — this sets today's price)</small>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="filter clubs or leagues" style={{ height: 32, borderRadius: 8, padding: '0 8px', marginTop: 8, width: 220 }} />
      <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'grid', gap: 4, fontSize: 12.5, maxHeight: 320, overflowY: 'auto' }}>
        {rows.slice(0, 300).map((m) => (
          <li key={m.club_id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px auto', gap: 6, alignItems: 'center' }}>
            <span>
              {m.club_name ?? m.club_id} <small style={{ color: 'var(--muted)' }}>{m.league}{m.base_price !== m.price ? ` · start ${m.base_price}` : ''}</small>
            </span>
            <input type="number" step={0.5} min={1} defaultValue={m.price} id={'pr' + m.club_id} style={{ height: 28 }} />
            <Button size="sm" variant="ghost" onClick={() => set.mutate({ club: m.club_id, price: Number((document.getElementById('pr' + m.club_id) as HTMLInputElement).value) })}>
              Save
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function TeamMappings() {
  const toast = useToast();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['adminTeamMappings'], queryFn: db.adminTeamMappings });
  const [q, setQ] = useState('');
  const set = useMutation({
    mutationFn: ({ club, provider, id }: { club: string; provider: string; id: string }) => db.adminSetTeamMapping(club, provider, id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['adminTeamMappings'] }),
    onError: (e: Error) => toast('Error: ' + e.message)
  });
  const rows = (list.data ?? []).filter((m) => !q || (m.club_name ?? m.club_id).toLowerCase().includes(q.toLowerCase()));
  return (
    <Card tight>
      <b>Team mappings</b> <small style={{ color: 'var(--muted)' }}>(club → provider team id; for football-data.org use its numeric team id and provider "football-data")</small>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="filter clubs" style={{ height: 32, borderRadius: 8, padding: '0 8px', marginTop: 8, width: 220 }} />
      <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'grid', gap: 4, fontSize: 12.5, maxHeight: 320, overflowY: 'auto' }}>
        {rows.slice(0, 300).map((m) => (
          <li key={m.club_id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 160px auto', gap: 6, alignItems: 'center' }}>
            <span>
              {m.club_name ?? m.club_id} <small style={{ color: 'var(--muted)' }}>{m.league}</small>
            </span>
            <input defaultValue={m.provider} id={'pv' + m.club_id} style={{ height: 28 }} />
            <input defaultValue={m.provider_team_id} id={'pt' + m.club_id} style={{ height: 28 }} />
            <Button size="sm" variant="ghost" onClick={() => set.mutate({ club: m.club_id, provider: (document.getElementById('pv' + m.club_id) as HTMLInputElement).value, id: (document.getElementById('pt' + m.club_id) as HTMLInputElement).value })}>
              Save
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
