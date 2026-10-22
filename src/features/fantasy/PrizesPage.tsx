// Prizes: what this cup's winners get (the pool, with sponsors), and my own
// prizes — claim with an address, confirm arrival (a shirt then joins the
// collection), and the official rules.
import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import type { Prize } from '../../utils/db.ts';
import { Button, Dialog, Page, Skeleton, TextField } from '../../ui/index.ts';

export default function PrizesPage() {
  const { t, money } = usePrefs();
  const { user } = useSession();
  usePageMeta(t('fantasy.prizes.title') + ' · Fantasy', t('fantasy.prizes.body'));
  const pool = useQuery({ queryKey: ['fantasyPrizePool'], queryFn: db.loadPrizePool, staleTime: 60_000, retry: false });
  const mine = useQuery({ queryKey: ['fantasyPrizes', user?.id], queryFn: db.loadMyPrizes, enabled: !!user, staleTime: 30_000, retry: false });
  const [claiming, setClaiming] = useState<Prize | null>(null);
  const prizeLabel = (p: { type: string; value: number | null; title: string }) => (p.type === 'voucher' ? t('fantasy.prizes.voucher', { amount: money(Number(p.value ?? 0)) }) : t('fantasy.prizes.shirt'));
  return (
    <Page>
      <Link to="/fantasy" className="btn btn--ghost btn--sm" style={{ marginBottom: 16 }}>
        ← Fantasy
      </Link>
      <h1 className="display" style={{ fontSize: 'clamp(28px,4vw,40px)', margin: 0 }}>
        🎁 {t('fantasy.prizes.title')}
      </h1>
      <p style={{ color: 'var(--text-2)', marginTop: 8, maxWidth: 640, lineHeight: 1.5 }}>
        {t('fantasy.prizes.body')} <Link to="/fantasy/rules">{t('fantasy.prizes.rules')}</Link>
      </p>

      {user && (
        <section style={{ marginTop: 22 }} aria-labelledby="my-prizes">
          <h2 id="my-prizes" className="title" style={{ margin: '0 0 10px' }}>
            {t('fantasy.prizes.title')}
          </h2>
          {mine.isLoading && <Skeleton height={100} radius={18} />}
          {mine.data && !mine.data.length && <p style={{ color: 'var(--muted)', fontSize: 14 }}>{t('fantasy.prizes.none')}</p>}
          <ul className="fantasy-prizes">
            {(mine.data ?? []).map((p) => (
              <li key={p.id} className={'card fantasy-prize is-' + p.status}>
                <div style={{ minWidth: 0 }}>
                  <b>{p.title}</b> · {prizeLabel(p)}
                  <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                    {p.cup_name} · {p.scope_name} · #{p.rank}
                    {p.sponsor_name && ' · ' + t('fantasy.prizes.by', { sponsor: p.sponsor_name })}
                    {p.kit_name && ' · ' + p.kit_name}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>{t('fantasy.prizes.status.' + p.status)}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {p.status === 'won' && (
                    <Button size="sm" onClick={() => setClaiming(p)}>
                      {t('fantasy.prizes.claim')}
                    </Button>
                  )}
                  {p.status === 'shipped' && <ReceivedButton p={p} />}
                  {p.status === 'received' && p.item_id && (
                    <Link to={'/vault/' + encodeURIComponent(p.item_id)} className="btn btn--secondary btn--sm">
                      {t('fantasy.prizes.addShirt')}
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section style={{ marginTop: 22 }} aria-labelledby="pool">
        <h2 id="pool" className="title" style={{ margin: '0 0 10px' }}>
          {t('fantasy.prizes.pool')}
        </h2>
        {pool.isLoading && <Skeleton height={100} radius={18} />}
        <ul className="fantasy-prizes">
          {(pool.data ?? [])
            .filter((p) => p.active)
            .map((p) => (
              <li key={p.id} className="card fantasy-prize">
                <div style={{ minWidth: 0 }}>
                  <b>{p.title}</b> · {prizeLabel(p)}
                  <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                    {p.scope === 'division' ? t('fantasy.st.division', { n: '' }).trim() + ' #' + p.rank : t('fantasy.lg.title') + ' #' + p.rank}
                    {p.description && ' · ' + p.description}
                    {p.sponsor_name && ' · ' + t('fantasy.prizes.by', { sponsor: p.sponsor_name })}
                  </div>
                </div>
                {p.sponsor_logo && <img src={p.sponsor_logo} alt={p.sponsor_name ?? ''} style={{ height: 28, objectFit: 'contain' }} />}
              </li>
            ))}
        </ul>
      </section>
      {claiming && <ClaimDialog p={claiming} onClose={() => setClaiming(null)} />}
    </Page>
  );
}

function ReceivedButton({ p }: { p: Prize }) {
  const { t } = usePrefs();
  const toast = useToast();
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => db.prizeReceived(p.id),
    onSuccess: () => {
      toast(t('fantasy.prizes.receivedDone'));
      void qc.invalidateQueries({ queryKey: ['fantasyPrizes'] });
      void qc.invalidateQueries({ queryKey: ['collection'] });
    },
    onError: () => toast(t('fantasy.md.err.failed'))
  });
  return (
    <Button size="sm" onClick={() => m.mutate()} busy={m.isPending}>
      {t('fantasy.prizes.received')}
    </Button>
  );
}

function ClaimDialog({ p, onClose }: { p: Prize; onClose: () => void }) {
  const { t } = usePrefs();
  const toast = useToast();
  const qc = useQueryClient();
  const [f, setF] = useState({ name: '', street: '', zip: '', city: '', country: 'CH' });
  const m = useMutation({
    mutationFn: () => db.claimPrize(p.id, f),
    onSuccess: () => {
      toast(t('fantasy.prizes.claimed'));
      void qc.invalidateQueries({ queryKey: ['fantasyPrizes'] });
      onClose();
    },
    onError: () => toast(t('fantasy.md.err.failed'))
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <Dialog open onClose={onClose} title={t('fantasy.prizes.claimTitle')} width={460}>
      <p style={{ margin: '0 0 12px', fontWeight: 650 }}>{p.title}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          m.mutate();
        }}
        style={{ display: 'grid', gap: 10 }}
      >
        <TextField label={t('fantasy.prizes.name')} value={f.name} onChange={set('name')} required />
        <TextField label={t('fantasy.prizes.street')} value={f.street} onChange={set('street')} required />
        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10 }}>
          <TextField label={t('fantasy.prizes.zip')} value={f.zip} onChange={set('zip')} required />
          <TextField label={t('fantasy.prizes.city')} value={f.city} onChange={set('city')} required />
        </div>
        <TextField label={t('fantasy.prizes.country')} value={f.country} onChange={set('country')} />
        <Button type="submit" busy={m.isPending}>
          {t('fantasy.prizes.claim')}
        </Button>
      </form>
    </Dialog>
  );
}
