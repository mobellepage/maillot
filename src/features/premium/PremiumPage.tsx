// /premium — the free plan (unlimited shirts, 20 AI scans a month, 8 %)
// next to Premium (unlimited scans, studio look, 6 %, insurance list; CHF 4.90
// a month or CHF 39 a year via Stripe). Every account starts with a week of
// Premium. While payments aren't switched on, the button puts the member on
// the waitlist instead.
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FEES } from '../../config/rules.ts';
import { PLAN, PREMIUM_PRICE, type PremiumInterval } from '../../config/plans.ts';
import { formatDate } from '../../lib/format.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import { Button, ButtonLink, CheckIcon, Notice, Page, Segmented } from '../../ui/index.ts';
import { daysLeft, usePlan } from './usePlan.ts';

const chf = (n: number) => 'CHF ' + n.toFixed(2).replace(/\.00$/, '.–');
const pct = (r: number) => Math.round(r * 100) + ' %';

function Benefit({ children }: { children: ReactNode }) {
  return (
    <li style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '6px 0' }}>
      <span style={{ color: 'var(--accent)', marginTop: 2, flex: 'none' }}>
        <CheckIcon size={16} />
      </span>
      <span>{children}</span>
    </li>
  );
}

export default function PremiumPage() {
  const { t, lang } = usePrefs();
  usePageMeta(t('premium.meta'));
  const { user, profile } = useSession();
  const plan = usePlan();
  const toast = useToast();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const [interval, setInterval] = useState<PremiumInterval>('year');
  const welcome = params.get('welcome') === '1';

  // Back from Stripe: Premium arrives with the webhook a moment later.
  useEffect(() => {
    if (!welcome || profile?.premium) return;
    const id = window.setInterval(() => {
      qc.invalidateQueries({ queryKey: ['profile', user?.id] });
      qc.invalidateQueries({ queryKey: ['my-plan'] });
    }, 3000);
    return () => window.clearInterval(id);
  }, [welcome, profile?.premium, qc, user?.id]);

  const buy = useMutation({
    mutationFn: async () => {
      const r = await db.startPremiumCheckout(interval);
      if (!r.configured) {
        await db.joinPremiumWaitlist();
        return 'waitlist' as const;
      }
      if (r.url) window.location.assign(r.url);
      return r.already ? ('already' as const) : ('redirect' as const);
    },
    onSuccess: (r) => {
      if (r === 'waitlist') {
        toast(t('premium.waitlisted'));
        qc.invalidateQueries({ queryKey: ['profile', user?.id] });
      }
    },
    onError: () => toast(t('premium.failed'))
  });
  const portal = useMutation({
    mutationFn: async () => {
      const r = await db.openPremiumPortal();
      if (r.configured && r.url) window.location.assign(r.url);
      else throw new Error('no portal');
    },
    onError: () => toast(t('premium.failed'))
  });

  const price = interval === 'year' ? t('premium.perYear', { price: chf(PREMIUM_PRICE.year) }) : t('premium.perMonth', { price: chf(PREMIUM_PRICE.month) });
  const perMonth = chf(Math.round((PREMIUM_PRICE.year / 12) * 100) / 100);
  const freeMonths = Math.floor((PREMIUM_PRICE.month * 12 - PREMIUM_PRICE.year) / PREMIUM_PRICE.month);
  const free = plan?.plan === 'free';
  const used = plan ? Math.min(plan.scansUsed, plan.scansLimit) : 0;

  return (
    <Page narrow>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent)' }}>Maillot Premium</div>
        <h1 className="display display--lg" style={{ margin: '8px auto 0', maxWidth: 640, textWrap: 'balance' }}>
          {t('premium.title')}
        </h1>
        <p className="lede" style={{ margin: '14px auto 0', maxWidth: 540 }}>
          {t('premium.lede', { n: PLAN.freeScans })}
        </p>
      </div>

      {welcome && <Notice tone={profile?.premium ? 'accent' : 'info'} style={{ marginTop: 24 }}>{profile?.premium ? t('premium.welcome') : t('premium.activating')}</Notice>}

      {plan?.plan === 'trial' && (
        <Notice tone="accent" style={{ marginTop: 24 }}>
          <strong>{t('premium.trialNow', { n: daysLeft(plan.trialUntil) })}</strong>
          <p style={{ margin: '4px 0 0', lineHeight: 1.5 }}>{t('premium.trialBody', { date: formatDate(plan.trialUntil!, lang), n: PLAN.freeScans, scans: plan.scansUsed })}</p>
        </Notice>
      )}

      {free && plan && (
        <div style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14, color: 'var(--text-2)', flexWrap: 'wrap' }}>
            <span>{t('premium.scansUsed', { n: used, max: plan.scansLimit })}</span>
            {plan.scansReset && <span>{t('premium.scansReset', { date: formatDate(plan.scansReset, lang) })}</span>}
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'var(--sunken)', marginTop: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: Math.min(100, (used / plan.scansLimit) * 100) + '%', background: 'var(--accent-fill)' }} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
        <Segmented
          label={t('premium.interval')}
          value={interval}
          onChange={setInterval}
          options={[
            { value: 'month', label: t('premium.monthly') },
            { value: 'year', label: t('premium.yearly') }
          ]}
        />
      </div>

      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,260px),1fr))', marginTop: 20 }}>
        <section aria-labelledby="plan-free" className="card" style={{ padding: 24, borderRadius: 24 }}>
          <h2 id="plan-free" className="title" style={{ fontSize: 20, margin: 0 }}>
            {t('premium.free')}
          </h2>
          <div className="mono" style={{ fontSize: 28, fontWeight: 700, marginTop: 10 }}>
            CHF 0
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 0', fontSize: 15 }}>
            <Benefit>{t('premium.b.shirts')}</Benefit>
            <Benefit>{t('premium.b.freeScans', { n: PLAN.freeScans })}</Benefit>
            <Benefit>{t('premium.b.market')}</Benefit>
            <Benefit>{t('premium.b.rate', { pct: pct(FEES.sellerRate) })}</Benefit>
          </ul>
          {free && <p style={{ margin: '16px 0 0', fontSize: 13.5, color: 'var(--muted)' }}>{t('premium.current')}</p>}
        </section>

        <section aria-labelledby="plan-premium" className="card card--accent" style={{ padding: 24, borderRadius: 24, position: 'relative' }}>
          <h2 id="plan-premium" className="title" style={{ fontSize: 20, margin: 0 }}>
            Premium
          </h2>
          <div className="mono" style={{ fontSize: 28, fontWeight: 700, marginTop: 10 }}>
            {price}
          </div>
          {interval === 'year' && <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginTop: 4 }}>{t('premium.yearSave', { price: perMonth, n: freeMonths })}</div>}
          <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 0', fontSize: 15 }}>
            <Benefit>
              <strong>{t('premium.b.scans')}</strong>
            </Benefit>
            <Benefit>{t('premium.b.studio')}</Benefit>
            <Benefit>{t('premium.b.premiumRate', { pct: pct(PLAN.premiumRate), was: pct(FEES.sellerRate) })}</Benefit>
            <Benefit>
              {t('premium.b.insurance')} {user && <Link to="/vault/insurance">{t('premium.b.insuranceOpen')}</Link>}
            </Benefit>
            <Benefit>{t('premium.b.auth', { amount: chf(PLAN.authDiscountChf) })}</Benefit>
            <Benefit>{t('premium.b.cancel')}</Benefit>
          </ul>
          <div style={{ marginTop: 20 }}>
            {!user ? (
              <ButtonLink to="/signin" block>
                {t('premium.signin')}
              </ButtonLink>
            ) : profile?.premium ? (
              <>
                <p style={{ margin: '0 0 12px', fontWeight: 600 }}>{t('premium.active', { date: formatDate(profile.premiumUntil!, lang) })}</p>
                <Button variant="secondary" block busy={portal.isPending} onClick={() => portal.mutate()}>
                  {t('premium.manage')}
                </Button>
              </>
            ) : profile?.premiumWaitlist ? (
              <p style={{ margin: 0, fontWeight: 600 }}>{t('premium.onList')}</p>
            ) : (
              <Button block busy={buy.isPending} onClick={() => buy.mutate()}>
                {profile?.trial ? t('premium.keep') : t('premium.cta')}
              </Button>
            )}
          </div>
        </section>
      </div>
      <p style={{ marginTop: 18, fontSize: 13, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.5 }}>{t('premium.fineprint', { n: PLAN.premiumScans, days: PLAN.trialDays })}</p>
    </Page>
  );
}
