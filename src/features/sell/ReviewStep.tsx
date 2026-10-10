import { Link } from 'react-router';
import { sellerPayout } from '../../fees.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { Button, Card, KeyValueList, Notice, ShirtGraphic, alpha } from '../../ui/index.ts';
import { usePayoutStatus } from '../vault/usePayoutStatus.ts';
import { LISTING_PHOTOS, type SellFlow } from './useSellFlow.ts';

export function ReviewStep({ f }: { f: SellFlow }) {
  const s = f.shirt!;
  const { money, t, label } = usePrefs();
  const payouts = usePayoutStatus();
  const needsPayouts = f.signedIn && payouts.data && !payouts.data.payouts_enabled;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, animation: 'kvIn .35s ease both' }}>
      <div style={{ flex: '1 1 360px', minWidth: 0, maxWidth: 520 }}>
        <div style={{ aspectRatio: '1/1', borderRadius: 28, overflow: 'hidden', background: `radial-gradient(circle at 50% 45%,${alpha(s.glow, 0.34)},rgba(0,0,0,0) 60%),var(--sunken)`, border: '1px solid var(--line)', display: 'grid', placeItems: 'center' }}>
          {f.photos.front ? (
            <img src={f.photos.front.dataUrl} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <ShirtGraphic hero pat={s.pat} trim={s.trim} crest={s.crest} photo={s.photo} title={s.name} style={{ width: '66%' }} />
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {LISTING_PHOTOS.filter(([k]) => k !== 'front' && f.photos[k]).map(([k, key]) => (
            <img key={k} src={f.photos[k]!.dataUrl} alt={t(key)} style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover', border: '1px solid var(--line)' }} />
          ))}
        </div>
      </div>
      <Card style={{ flex: '1 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <h2 className="display" style={{ fontSize: 22, fontStretch: '78%', marginBottom: 10 }}>
          {t('sell.reviewListing')}
        </h2>
        <KeyValueList
          rows={[
            [t('sell.shirt'), s.name],
            [t('sell.size'), f.size],
            [t('sell.condition'), label('cond', f.condition)],
            [t('sell.edition'), label('edition', f.edition)],
            [t('sell.playerPrint'), f.player || t('sell.none')],
            [t('sell.asking'), money(f.amount)],
            [t('sell.youEarn'), money(sellerPayout(f.amount).payout)]
          ]}
        />
        <div style={{ flex: 1, minHeight: 16 }} />
        {needsPayouts && (
          <Notice tone="info" style={{ marginTop: 14 }}>
            {t('sell.payoutsNotice')} <Link to="/vault">{t('sell.setupPayouts')}</Link>
          </Notice>
        )}
        {f.signedIn ? (
          <Button size="lg" block busy={f.busy} busyLabel={t('sell.publishing')} onClick={f.publish} style={{ marginTop: 18 }}>
            {t('sell.publish')}
          </Button>
        ) : (
          <Link to="/signin" state={{ from: `/sell?shirt=${s.id}&size=${f.size}`, notice: 'auth.signInToSell' }} className="btn btn--primary btn--lg btn--block" style={{ marginTop: 18 }}>
            {t('sell.signIn')}
          </Link>
        )}
        <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', margin: '10px 0 0' }}>{t('sell.shipNote')}</p>
      </Card>
    </div>
  );
}
