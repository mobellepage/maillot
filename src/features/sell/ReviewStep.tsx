import { Link } from 'react-router';
import { sellerPayout } from '../../fees.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { Button, Card, KeyValueList, Notice, ShirtGraphic, alpha } from '../../ui/index.ts';
import { usePayoutStatus } from '../vault/usePayoutStatus.ts';
import type { SellFlow } from './useSellFlow.ts';

export function ReviewStep({ f }: { f: SellFlow }) {
  const s = f.shirt!;
  const { money } = usePrefs();
  const payouts = usePayoutStatus();
  const needsPayouts = f.signedIn && payouts.data && !payouts.data.payouts_enabled;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, animation: 'kvIn .35s ease both' }}>
      <div style={{ flex: '1 1 360px', minWidth: 0, aspectRatio: '1/1', maxWidth: 520, borderRadius: 28, background: `radial-gradient(circle at 50% 45%,${alpha(s.glow, 0.34)},rgba(0,0,0,0) 60%),var(--sunken)`, border: '1px solid var(--line)', display: 'grid', placeItems: 'center' }}>
        <ShirtGraphic hero pat={s.pat} trim={s.trim} crest={s.crest} title={s.name} style={{ width: '66%' }} />
      </div>
      <Card style={{ flex: '1 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <h2 className="display" style={{ fontSize: 22, fontStretch: '78%', marginBottom: 10 }}>
          Review listing
        </h2>
        <KeyValueList
          rows={[
            ['Shirt', s.name],
            ['Size', f.size],
            ['Condition', f.condition],
            ['Edition', f.edition],
            ['Player print', f.player || 'None'],
            ['Asking price', money(f.amount)],
            ['You earn', money(sellerPayout(f.amount).payout)]
          ]}
        />
        <div style={{ flex: 1, minHeight: 16 }} />
        {needsPayouts && (
          <Notice tone="info" style={{ marginTop: 14 }}>
            You can list now. To get paid when it sells, <Link to="/vault">set up payouts</Link> — it takes about two minutes with Stripe.
          </Notice>
        )}
        {f.signedIn ? (
          <Button size="lg" block busy={f.busy} busyLabel="Publishing…" onClick={f.publish} style={{ marginTop: 18 }}>
            Publish listing
          </Button>
        ) : (
          <Link to="/signin" state={{ from: `/sell?shirt=${s.id}&size=${f.size}`, notice: 'auth.signInToSell' }} className="btn btn--primary btn--lg btn--block" style={{ marginTop: 18 }}>
            Sign in to publish
          </Link>
        )}
        <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', margin: '10px 0 0' }}>You’ll ship to our Zürich vault with a prepaid label once it sells.</p>
      </Card>
    </div>
  );
}
