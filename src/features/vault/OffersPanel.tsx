// Offers on collection shirts, in "My collection": offers received (accept
// or decline) and offers sent (withdraw, or pay once accepted).
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BY } from '../../data.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import type { CollectionOffer } from '../../utils/db.ts';
import { Badge, Button, ButtonLink, Card, useConfirm } from '../../ui/index.ts';

const TONE = { open: 'accent', accepted: 'accent', declined: 'neutral', withdrawn: 'neutral', expired: 'neutral' } as const;

function OfferRow({ o }: { o: CollectionOffer }) {
  const { t, money } = usePrefs();
  const toast = useToast();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const name = (o.catalog_id && BY[o.catalog_id]?.name) || o.catalog_id || '';
  const done = () => qc.invalidateQueries({ queryKey: ['myOffers'] });
  const respond = useMutation({
    mutationFn: (accept: boolean) => db.respondToOffer(o.id, accept),
    onSuccess: (_r, accept) => {
      toast(accept ? t('offer.accepted') : t('offer.declined'));
      done();
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: () => toast(t('toast.actionFailed'))
  });
  const withdraw = useMutation({ mutationFn: () => db.withdrawOffer(o.id), onSuccess: done, onError: () => toast(t('toast.actionFailed')) });
  const open = o.status === 'open';
  return (
    <Card tight style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 220px', minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>
          <span className="mono">{money(Number(o.amount))}</span> · {name}
          {o.size && <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · {o.size}</span>}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>
          {o.direction === 'received' ? t('offer.from', { handle: o.other_handle ? '@' + o.other_handle : t('seller.newSeller') }) : t('offer.to', { handle: o.other_handle ? '@' + o.other_handle : '' })}
          {o.message && <> · “{o.message}”</>}
        </div>
      </div>
      <Badge tone={TONE[o.status]}>{t('offer.status.' + o.status)}</Badge>
      {open && o.direction === 'received' && (
        <span style={{ display: 'flex', gap: 8 }}>
          <Button
            size="sm"
            busy={respond.isPending && respond.variables === true}
            onClick={async () =>
              (await confirm({ title: t('offer.acceptTitle', { price: money(Number(o.amount)) }), body: t('offer.acceptBody'), confirmLabel: t('offer.accept') })) && respond.mutate(true)
            }
          >
            {t('offer.accept')}
          </Button>
          <Button size="sm" variant="ghost" busy={respond.isPending && respond.variables === false} onClick={() => respond.mutate(false)}>
            {t('offer.decline')}
          </Button>
        </span>
      )}
      {open && o.direction === 'sent' && (
        <Button size="sm" variant="ghost" busy={withdraw.isPending} onClick={() => withdraw.mutate()}>
          {t('offer.withdraw')}
        </Button>
      )}
      {o.status === 'accepted' && o.order_id && (
        <ButtonLink size="sm" to={'/orders/' + o.order_id}>
          {o.direction === 'sent' ? t('offer.pay') : t('offer.order')}
        </ButtonLink>
      )}
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
