import { usePageMeta } from '../../lib/meta.ts';
import { useCatalog } from '../catalog/useCatalog.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { Button, ButtonLink, CheckIcon, Page } from '../../ui/index.ts';
import { DetailsStep } from './DetailsStep.tsx';
import { IdentifyStep } from './IdentifyStep.tsx';
import { PriceStep } from './PriceStep.tsx';
import { ReviewStep } from './ReviewStep.tsx';
import { useSellFlow } from './useSellFlow.ts';

const STEPS = ['Identify', 'Details', 'Price', 'Review'];

export default function SellPage() {
  useCatalog(); // re-render when the live catalogue loads
  usePageMeta('Sell a football shirt', 'List a football shirt in under a minute. Authenticated in Zürich, paid out after delivery.');
  const f = useSellFlow();
  const { money } = usePrefs();

  if (f.published && f.shirt) {
    return (
      <Page>
        <div style={{ maxWidth: 560, margin: 'clamp(20px,6vw,60px) auto', textAlign: 'center' }}>
          <div aria-hidden="true" style={{ width: 88, height: 88, borderRadius: '50%', margin: '0 auto 24px', background: 'var(--accent-soft)', border: '2px solid var(--accent)', display: 'grid', placeItems: 'center', color: 'var(--accent)', boxShadow: '0 0 60px rgba(75,255,139,0.25)' }}>
            <CheckIcon size={36} />
          </div>
          <h1 className="display display--lg">{f.published.sold ? 'Sold' : 'You’re live'}</h1>
          <p className="lede" style={{ margin: '14px 0 28px' }}>
            {f.published.sold
              ? `Your ${f.shirt.name} (size ${f.size}) matched a waiting buyer at ${money(f.published.amount)}. Once they pay, you’ll get a prepaid label to ship it to our Zürich vault.`
              : `Your ${f.shirt.name} (size ${f.size}) is listed at ${money(f.published.amount)}. Buyers watching this shirt see it now — we’ll notify you the moment it sells.`}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <ButtonLink to={'/shirt/' + f.shirt.id}>View shirt</ButtonLink>
            <Button variant="ghost" onClick={f.reset}>
              List another
            </Button>
          </div>
        </div>
      </Page>
    );
  }

  const canNext = f.step === 2 ? f.amount > 0 : true;
  return (
    <Page>
      <div className="eyebrow">Sell a shirt</div>
      <h1 className="display display--lg" style={{ marginTop: 8 }}>
        List in under a minute
      </h1>
      <ol aria-label="Steps" style={{ listStyle: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: 10, margin: '28px 0 32px', overflowX: 'auto', paddingBottom: 4 }}>
        {STEPS.map((l, i) => (
          <li key={l} aria-current={i === f.step ? 'step' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
            <span className="mono" style={{ width: 28, height: 28, borderRadius: '50%', background: i < f.step ? 'var(--accent)' : i === f.step ? 'var(--text)' : 'var(--step-idle)', color: i <= f.step ? 'var(--bg)' : 'var(--muted)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>
              {i < f.step ? <CheckIcon size={13} /> : i + 1}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: i <= f.step ? 'var(--text)' : 'var(--muted)', whiteSpace: 'nowrap' }}>{l}</span>
            {i < STEPS.length - 1 && <span aria-hidden="true" style={{ width: 'clamp(20px,5vw,56px)', height: 2, borderRadius: 2, background: i < f.step ? 'var(--accent)' : 'rgba(255,255,255,0.1)' }} />}
          </li>
        ))}
      </ol>

      {f.step === 0 && <IdentifyStep f={f} />}
      {f.step === 1 && f.shirt && <DetailsStep f={f} />}
      {f.step === 2 && f.shirt && <PriceStep f={f} />}
      {f.step === 3 && f.shirt && <ReviewStep f={f} />}

      {f.step > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 32, maxWidth: 1100 }}>
          <Button variant="ghost" onClick={() => f.go(f.step - 1)}>
            ← Back
          </Button>
          {f.step < 3 && (
            <Button variant="light" disabled={!canNext} onClick={() => f.go(f.step + 1)}>
              {f.step === 2 ? 'Review listing' : 'Continue'} →
            </Button>
          )}
        </div>
      )}
    </Page>
  );
}
