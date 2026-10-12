// /premium — the free plan (10 shirts) next to Premium (unlimited shirts,
// CHF 4.90/month or CHF 49/year via Stripe). While payments aren't switched
// on, the button puts the member on the waitlist instead.
import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FREE_SHIRT_LIMIT, PREMIUM_PRICE, type PremiumInterval } from '../../config/plans.ts';
import { formatDate } from '../../lib/format.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import { Button, ButtonLink, CheckIcon, Notice, Page, Segmented } from '../../ui/index.ts';
import { useCollection } from '../vault/useCollection.ts';

const chf = (n: number) => 'CHF ' + n.toFixed(2).replace(/\.00$/, '.–');

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
  const { items } = useCollection();
  const toast = useToast();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const [interval, setInterval] = useState<PremiumInterval>('year');
  const welcome = params.get('welcome') === '1';

  // Back from Stripe: Premium arrives with the webhook a moment later.
  useEffect(() => {
    if (!welcome || profile?.premium) return;
    const id = window.setInterval(() => qc.invalidateQueries({ queryKey: ['profile', user?.id] }), 3000);
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

  const used = items.length;
  const price = interval === 'year' ? t('premium.perYear', { price: chf(PREMIUM_PRICE.year) }) : t('premium.perMonth', { price: chf(PREMIUM_PRICE.month) });

  return (
    <Page narrow>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent)' }}>MAILLOT Premium</div>
        <h1 className="display display--lg" style={{ margin: '8px auto 0', maxWidth: 640, textWrap: 'balance' }}>
          {t('premium.title')}
        </h1>
        <p className="lede" style={{ margin: '14px auto 0', maxWidth: 520 }}>
          {t('premium.lede', { n: FREE_SHIRT_LIMIT })}
        </p>
      </div>

      {welcome && <Notice tone={profile?.premium ? 'accent' : 'info'} style={{ marginTop: 24 }}>{profile?.premium ? t('premium.welcome') : t('premium.activating')}</Notice>}

      {user && !profile?.premium && (
        <div style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--text-2)' }}>
            <span>{t('premium.used', { n: used, max: FREE_SHIRT_LIMIT })}</span>
            {used >= FREE_SHIRT_LIMIT && <strong style={{ color: 'var(--text)' }}>{t('premium.full')}</strong>}
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'var(--sunken)', marginTop: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: Math.min(100, (used / FREE_SHIRT_LIMIT) * 100) + '%', background: 'var(--accent-fill)' }} />
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
            <Benefit>{t('premium.b.freeShirts', { n: FREE_SHIRT_LIMIT })}</Benefit>
            <Benefit>{t('premium.b.value')}</Benefit>
            <Benefit>{t('premium.b.market')}</Benefit>
          </ul>
          {user && !profile?.premium && <p style={{ margin: '16px 0 0', fontSize: 13.5, color: 'var(--muted)' }}>{t('premium.current')}</p>}
        </section>

        <section aria-labelledby="plan-premium" className="card card--accent" style={{ padding: 24, borderRadius: 24, position: 'relative' }}>
          <h2 id="plan-premium" className="title" style={{ fontSize: 20, margin: 0 }}>
            Premium
          </h2>
          <div className="mono" style={{ fontSize: 28, fontWeight: 700, marginTop: 10 }}>
            {price}
          </div>
          {interval === 'year' && <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginTop: 4 }}>{t('premium.twoFree')}</div>}
          <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 0', fontSize: 15 }}>
            <Benefit>
              <strong>{t('premium.b.unlimited')}</strong>
            </Benefit>
            <Benefit>{t('premium.b.everything')}</Benefit>
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
                {t('premium.cta')}
              </Button>
            )}
          </div>
        </section>
      </div>
      <p style={{ marginTop: 18, fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>{t('premium.fineprint')}</p>
    </Page>
  );
}
