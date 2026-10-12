// Offers on collection shirts, in "My collection": offers received (accept
// or decline) and offers sent (withdraw, or pay once accepted).
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BY } from '../../data.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import type { CollectionOffer } from '../../utils/db.ts';
import { Badge, Button, ButtonLink, Card, Dialog, TextField, useConfirm } from '../../ui/index.ts';
import { OFFER_POLICY } from '../../config/rules.ts';
import { marketValue } from '../catalog/model.ts';

const TONE = { open: 'accent', accepted: 'accent', declined: 'neutral', withdrawn: 'neutral', expired: 'neutral' } as const;

function OfferRow({ o }: { o: CollectionOffer }) {
  const { t, money } = usePrefs();
  const toast = useToast();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [countering, setCountering] = useState(false);
  // Read the clock once per card; good enough for 'hours left'.
  const [now] = useState(() => Date.now());
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const shirt = o.catalog_id ? BY[o.catalog_id] : undefined;
  const name = shirt?.name || o.catalog_id || '';
  const done = () => qc.invalidateQueries({ queryKey: ['myOffers'] });
  const respond = useMutation({
    mutationFn: (accept: boolean) => db.respondToOffer(o.id, accept),
    onSuccess: (order, accept) => {
      toast(accept ? t('offer.accepted') : t('offer.declined'));
      done();
      qc.invalidateQueries({ queryKey: ['orders'] });
      // The buyer accepting a counter-offer pays next.
      if (accept && order && o.direction === 'sent') navigate('/orders/' + order);
    },
    onError: () => toast(t('toast.actionFailed'))
  });
  const counter = useMutation({
    mutationFn: () => db.counterOffer(o.id, Number(amount), message),
    onSuccess: () => {
      setCountering(false);
      toast(t('offer.countered'));
      done();
    },
    onError: () => toast(t('toast.actionFailed'))
  });
  const withdraw = useMutation({ mutationFn: () => db.withdrawOffer(o.id), onSuccess: done, onError: () => toast(t('toast.actionFailed')) });
  const open = o.status === 'open';
  const iMadeIt = open && !o.awaiting_me;
  const canCounter = o.awaiting_me && o.round < OFFER_POLICY.maxRounds;
  // How the price compares with the estimate — for the owner deciding.
  const estimate = shirt && o.size ? marketValue(shirt, o.size) : null;
  const vsEstimate = o.direction === 'received' && estimate ? Math.round(((Number(o.amount) - estimate) / estimate) * 100) : null;
  const hoursLeft = open ? Math.max(0, Math.round((new Date(o.expires_at).getTime() - now) / 3600000)) : null;
  return (
    <Card tight>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px', minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>
            <span className="mono">{money(Number(o.amount))}</span> · {name}
            {o.size && <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · {o.size}</span>}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>
            {o.by_owner ? (o.direction === 'received' ? t('offer.yourCounter', { handle: o.other_handle ? '@' + o.other_handle : '' }) : t('offer.counterFrom', { handle: o.other_handle ? '@' + o.other_handle : '' })) : o.direction === 'received' ? t('offer.from', { handle: o.other_handle ? '@' + o.other_handle : t('seller.newSeller') }) : t('offer.to', { handle: o.other_handle ? '@' + o.other_handle : '' })}
            {o.round > 1 && <> · {t('offer.round', { n: o.round, max: OFFER_POLICY.maxRounds })}</>}
            {hoursLeft !== null && <> · {t('offer.hoursLeft', { n: hoursLeft })}</>}
            {o.message && <> · “{o.message}”</>}
          </div>
          {vsEstimate !== null && Math.abs(vsEstimate) >= 1 && (
            <div style={{ fontSize: 12.5, marginTop: 3, color: vsEstimate >= 0 ? 'var(--pos)' : 'var(--text-2)', fontWeight: 600 }}>
              {vsEstimate >= 0 ? t('offer.aboveEstimate', { pct: vsEstimate }) : t('offer.belowEstimate', { pct: -vsEstimate })}
            </div>
          )}
        </div>
        <Badge tone={TONE[o.status]}>{t('offer.status.' + o.status)}</Badge>
        {o.awaiting_me && (
          <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button
              size="sm"
              busy={respond.isPending && respond.variables === true}
              onClick={async () =>
                (await confirm({
                  title: t('offer.acceptTitle', { price: money(Number(o.amount)) }),
                  body: o.direction === 'received' ? t('offer.acceptBody') : t('offer.acceptBodyBuyer'),
                  confirmLabel: t('offer.accept')
                })) && respond.mutate(true)
              }
            >
              {t('offer.accept')}
            </Button>
            {canCounter && (
              <Button size="sm" variant="secondary" onClick={() => setCountering(true)}>
                {t('offer.counter')}
              </Button>
            )}
            <Button size="sm" variant="ghost" busy={respond.isPending && respond.variables === false} onClick={() => respond.mutate(false)}>
              {t('offer.decline')}
            </Button>
          </span>
        )}
        {iMadeIt && (
          <Button size="sm" variant="ghost" busy={withdraw.isPending} onClick={() => withdraw.mutate()}>
            {t('offer.withdraw')}
          </Button>
        )}
        {o.status === 'accepted' && o.order_id && (
          <ButtonLink size="sm" to={'/orders/' + o.order_id}>
            {o.direction === 'sent' ? t('offer.pay') : t('offer.order')}
          </ButtonLink>
        )}
      </div>
      <Dialog open={countering} onClose={() => setCountering(false)} title={t('offer.counterTitle')}>
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5, margin: '0 0 16px' }}>
          {t('offer.counterBody', { price: money(Number(o.amount)), name, round: o.round + 1, max: OFFER_POLICY.maxRounds })}
        </p>
        <TextField label={t('offer.counterAmount')} inputMode="numeric" autoFocus value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} adornment={<span className="mono">CHF</span>} />
        <div style={{ height: 12 }} />
        <TextField label={t('offer.message')} value={message} onChange={(e) => setMessage(e.target.value.slice(0, 300))} />
        <Button block style={{ marginTop: 16 }} disabled={!(Number(amount) >= 1)} busy={counter.isPending} onClick={() => counter.mutate()}>
          {t('offer.counterSend')}
        </Button>
      </Dialog>
    </Card>
  );
}

export function OffersPanel() {
  const { t } = usePrefs();
  const { user } = useSession();
  const offers = useQuery({ queryKey: ['myOffers', user?.id], queryFn: db.loadMyOffers, enabled: !!user });
  const list = offers.data ?? [];
  if (!list.length) return null;
  const received = list.filter((o) => o.direction === 'received');
  const sent = list.filter((o) => o.direction === 'sent');
  return (
    <section aria-labelledby="offers-title" style={{ marginTop: 24 }}>
      <h2 id="offers-title" className="title" style={{ fontSize: 17 }}>
        {t('offer.panelTitle')}
      </h2>
      {received.length > 0 && (
        <>
          <div style={{ fontSize: 13, color: 'var(--muted)', margin: '10px 0 6px' }}>{t('offer.received')}</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {received.map((o) => (
              <OfferRow key={o.id} o={o} />
            ))}
          </div>
        </>
      )}
      {sent.length > 0 && (
        <>
          <div style={{ fontSize: 13, color: 'var(--muted)', margin: '14px 0 6px' }}>{t('offer.sentTitle')}</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {sent.map((o) => (
              <OfferRow key={o.id} o={o} />
            ))}
          </div>
        </>
      )}
      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
        {t('offer.hint')} <Link to="/feed">{t('home.how.browse')}</Link>
      </p>
    </section>
  );
}
