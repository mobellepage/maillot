// /sell: two ways to list a shirt. Quick — identify, details with the front
// and the back, price: live at once, "self-reported". Complete — the guided
// photos and the pre-check of /vault/add: "pre-checked". Photos can follow
// later; the badge updates after the pre-check (vault/PrecheckPrompt).
import { Link } from 'react-router';
import { usePageMeta } from '../../lib/meta.ts';
import { useCatalog } from '../catalog/useCatalog.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { Button, ButtonLink, CheckIcon, Page } from '../../ui/index.ts';
import { DetailsStep } from './DetailsStep.tsx';
import { IdentifyStep } from './IdentifyStep.tsx';
import { PriceStep } from './PriceStep.tsx';
import { ReviewStep } from './ReviewStep.tsx';
import { useSellFlow } from './useSellFlow.ts';

const STEPS = ['sell.step.identify', 'sell.step.details', 'sell.step.price', 'sell.step.review'] as const;

export default function SellPage() {
  useCatalog(); // re-render when the live catalogue loads
  const { money, t } = usePrefs();
  usePageMeta(t('sell.metaTitle'), t('sell.metaDesc'));
  const f = useSellFlow();

  if (f.published && f.shirt) {
    return (
      <Page>
        <div style={{ maxWidth: 560, margin: 'clamp(20px,6vw,60px) auto', textAlign: 'center' }}>
          <div aria-hidden="true" className="success-mark" style={{ width: 88, height: 88, borderRadius: '50%', margin: '0 auto 24px', background: 'var(--accent-soft)', border: '2px solid var(--accent)', display: 'grid', placeItems: 'center', color: 'var(--accent)', boxShadow: '0 0 60px rgba(75,255,139,0.25)' }}>
            <CheckIcon size={36} />
          </div>
          <h1 className="display display--lg">{t('sell.live')}</h1>
          <p className="lede" style={{ margin: '14px 0 16px' }}>
            {t('sell.liveBody', { name: f.shirt.name, size: f.size, price: money(f.published.amount) })}
          </p>
          <p style={{ margin: '0 0 28px', fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5 }}>{t('sell.selfReported')}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <ButtonLink to={'/vault/item/' + f.published.itemId}>{t('sell.addPrecheckPhotos')}</ButtonLink>
            <Button variant="ghost" onClick={f.reset}>
              {t('sell.listAnother')}
            </Button>
          </div>
        </div>
      </Page>
    );
  }

  // First: which way to list it.
  if (!f.path) {
    const full = '/vault/add?goal=sale';
    return (
      <Page>
        <div className="eyebrow">{t('sell.eyebrow')}</div>
        <h1 className="display display--lg" style={{ marginTop: 8 }}>
          {t('sell.title')}
        </h1>
        <p className="lede" style={{ margin: '10px 0 26px', maxWidth: 640 }}>
          {t('sell.choose')}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 14, maxWidth: 860 }}>
          <button type="button" className="option-btn" onClick={() => f.setPath('quick')} style={{ padding: 20, textAlign: 'left' }}>
            <span style={{ display: 'block', fontSize: 26 }} aria-hidden="true">
              ⚡
            </span>
            <span style={{ display: 'block', fontWeight: 700, fontSize: 17, marginTop: 6 }}>{t('sell.quick')}</span>
            <span style={{ display: 'block', fontSize: 13.5, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.5 }}>{t('sell.quickBody')}</span>
            <span className="badge" style={{ marginTop: 12, display: 'inline-flex' }}>
              {t('mx.verify.self')}
            </span>
          </button>
          <Link to={full} className="option-btn" style={{ padding: 20, textAlign: 'left', color: 'var(--text)' }}>
            <span style={{ display: 'block', fontSize: 26 }} aria-hidden="true">
              🔍
            </span>
            <span style={{ display: 'block', fontWeight: 700, fontSize: 17, marginTop: 6 }}>{t('sell.full')}</span>
            <span style={{ display: 'block', fontSize: 13.5, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.5 }}>{t('sell.fullBody')}</span>
            <span className="badge badge--info" style={{ marginTop: 12, display: 'inline-flex' }}>
              {t('mx.verify.precheck')}
            </span>
          </Link>
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '16px 0 0', maxWidth: 640, lineHeight: 1.5 }}>{t('sell.laterPhotos')}</p>
      </Page>
    );
  }

  const canNext = f.step === 2 ? f.amount > 0 : f.step === 1 ? !!f.photos.front && !!f.photos.back && !f.photoBusy : true;
  return (
    <Page>
      <div className="eyebrow">{t('sell.eyebrow')}</div>
      <h1 className="display display--lg" style={{ marginTop: 8 }}>
        {t('sell.title')}
      </h1>
      <ol aria-label={t('sell.steps')} style={{ listStyle: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: 10, margin: '28px 0 32px' }}>
        {STEPS.map((l, i) => (
          <li key={l} aria-current={i === f.step ? 'step' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
            <span className="mono" style={{ width: 28, height: 28, borderRadius: '50%', background: i < f.step ? 'var(--accent)' : i === f.step ? 'var(--text)' : 'var(--step-idle)', color: i <= f.step ? 'var(--bg)' : 'var(--muted)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>
              {i < f.step ? <CheckIcon size={13} /> : i + 1}
            </span>
            <span className={i === f.step ? undefined : 'step-label-other'} style={{ fontSize: 14, fontWeight: 600, color: i <= f.step ? 'var(--text)' : 'var(--muted)', whiteSpace: 'nowrap' }}>
              {t(l)}
            </span>
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
            {t('sell.back')}
          </Button>
          {f.step < 3 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {f.step === 1 && !(f.photos.front && f.photos.back) && <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{t('sell.photoRequired')}</span>}
              <Button variant="light" disabled={!canNext} onClick={() => f.go(f.step + 1)}>
                {f.step === 2 ? t('sell.reviewListing') : t('sell.continue')} →
              </Button>
            </span>
          )}
        </div>
      )}
    </Page>
  );
}
