// "How buying works" — the trust page every purchase links to: escrow,
// direct shipping with photos, and the automatic authenticity pre-check.
// Deadlines and escrow are enforced in code (order_policy(),
// run_order_lifecycle(); see supabase/migrations/*direct_shipping.sql).

import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { BUYER_SHIPPING_CHF, SELLER_AUTH_FEE_CHF, SELLER_FEE_RATE } from '../../fees.ts';
import { ButtonLink, KeyValueList } from '../../ui/index.ts';
import { EXPERT_AUTH } from '../../config/rules.ts';

const ACC = 'var(--accent)';
const STEPS = [1, 2, 3, 4, 5].map((n) => ({ title: `auth.s${n}.t`, body: `auth.s${n}.b` }));
const FAQ = [1, 2, 3, 4].map((n) => ({ q: `auth.q${n}`, a: `auth.a${n}` }));
/** What an expert looks at (message keys). */
const EXPERT_CHECKS = [0, 1, 2, 3, 4].map((n) => `auth.ex.${n}`);
/** What the automatic pre-check looks at (message keys). */
const AI_CHECKS = [0, 1, 2, 3].map((n) => `auth.ai.${n}`);

export default function AuthenticationPage() {
  const { t, money } = usePrefs();
  usePageMeta(t('auth.meta'), t('auth.metaDesc'));
  return (
    <main id="main" style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(28px,4vw,56px) clamp(16px,4vw,40px) 96px', animation: 'kvIn .4s ease both' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: ACC }}>{t('auth.eyebrow')}</div>
      <h1 style={{ margin: '8px 0 0', fontSize: 'clamp(38px,6vw,76px)', fontWeight: 800, fontStretch: '72%', textTransform: 'uppercase', lineHeight: 0.92 }}>
        {t('auth.title')}
      </h1>
      <p style={{ maxWidth: 620, margin: '20px 0 0', fontSize: 'clamp(16px,1.4vw,18px)', lineHeight: 1.55, color: 'var(--text-2)', textWrap: 'pretty' }}>
        {t('auth.lede')}
      </p>

      <ol style={{ listStyle: 'none', padding: 0, margin: 'clamp(32px,5vw,56px) 0 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,190px),1fr))', gap: 12 }}>
        {STEPS.map((s, i) => (
          <li key={s.title} style={{ padding: 20, borderRadius: 20, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: ACC }}>{String(i + 1).padStart(2, '0')}</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 10, lineHeight: 1.25 }}>{t(s.title)}</div>
            <p style={{ margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-2)' }}>{t(s.body)}</p>
          </li>
        ))}
      </ol>

      <section style={{ marginTop: 'clamp(40px,6vw,72px)', display: 'flex', flexWrap: 'wrap', gap: 'clamp(24px,4vw,48px)' }}>
        <div style={{ flex: '1 1 280px' }}>
          <h2 style={{ margin: 0, fontSize: 'clamp(26px,3vw,36px)', fontWeight: 800, fontStretch: '78%', textTransform: 'uppercase', lineHeight: 1 }}>{t('auth.checklist')}</h2>
          <p style={{ margin: '12px 0 0', fontSize: 14.5, lineHeight: 1.55, color: 'var(--text-2)' }}>
            {t('auth.checklistBody')}
          </p>
          <p style={{ margin: '12px 0 0', fontSize: 14.5, lineHeight: 1.55, color: 'var(--text-2)' }}>
            {t('auth.ai.results')}
          </p>
        </div>
        <ul style={{ flex: '2 1 480px', listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,300px),1fr))', gap: 8 }}>
          {AI_CHECKS.map((c) => (
            <li key={c} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 12, background: 'var(--sunken)', fontSize: 14, lineHeight: 1.45 }}>
              <span aria-hidden="true" style={{ color: ACC, fontWeight: 700 }}>
                ✓
              </span>
              <span>{t(c)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section
        style={{
          marginTop: 'clamp(40px,6vw,72px)',
          padding: 'clamp(22px,3vw,36px)',
          borderRadius: 24,
          background: 'linear-gradient(160deg,rgba(75,255,139,0.12),rgba(75,255,139,0) 55%),var(--surface)',
          border: '1px solid rgba(75,255,139,0.3)'
        }}
      >
        <h2 style={{ margin: 0, fontSize: 'clamp(24px,2.8vw,32px)', fontWeight: 800, fontStretch: '78%', textTransform: 'uppercase' }}>{t('auth.guarantee')}</h2>
        <p style={{ maxWidth: 680, margin: '10px 0 0', fontSize: 15, lineHeight: 1.6, color: 'var(--text-2)' }}>
          {t('auth.guaranteeBody')}
        </p>
      </section>

      {/* Expert authentication: when it is required, what it checks, what it costs — and that it starts soon. */}
      <section id="expert" aria-labelledby="expert-title" style={{ marginTop: 'clamp(40px,6vw,72px)', padding: 'clamp(22px,3vw,36px)', borderRadius: 24, background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <h2 id="expert-title" style={{ margin: 0, fontSize: 'clamp(24px,2.8vw,32px)', fontWeight: 800, fontStretch: '78%', textTransform: 'uppercase' }}>
            {t('auth.ex.title')}
          </h2>
          {!EXPERT_AUTH.available && <span className="badge badge--warn">{t('auth.ex.soon')}</span>}
        </div>
        <p style={{ maxWidth: 680, margin: '12px 0 0', fontSize: 15, lineHeight: 1.6, color: 'var(--text-2)' }}>{t('auth.ex.when', { price: money(EXPERT_AUTH.thresholdChf) })}</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,300px),1fr))', gap: 8 }}>
          {EXPERT_CHECKS.map((c) => (
            <li key={c} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 12, background: 'var(--sunken)', fontSize: 14, lineHeight: 1.45 }}>
              <span aria-hidden="true" style={{ color: ACC, fontWeight: 700 }}>
                ✓
              </span>
              <span>{t(c)}</span>
            </li>
          ))}
        </ul>
        <p style={{ maxWidth: 680, margin: '16px 0 0', fontSize: 15, lineHeight: 1.6, color: 'var(--text-2)' }}>
          {t('auth.ex.cost', { fee: money(EXPERT_AUTH.feeChf) })} {!EXPERT_AUTH.available && t('auth.ex.until')}
        </p>
      </section>

      {/* Every fee, from config/rules.ts — and where Maillot trades. */}
      <section id="fees" aria-labelledby="fees-title" style={{ marginTop: 'clamp(40px,6vw,72px)', maxWidth: 680 }}>
        <h2 id="fees-title" style={{ margin: '0 0 14px', fontSize: 'clamp(24px,2.8vw,32px)', fontWeight: 800, fontStretch: '78%', textTransform: 'uppercase' }}>
          {t('auth.fees.title')}
        </h2>
        <KeyValueList
          rows={[
            [t('auth.fees.commission'), Math.round(SELLER_FEE_RATE * 1000) / 10 + ' %'],
            [t('auth.fees.shipping'), money(BUYER_SHIPPING_CHF)],
            [t('auth.fees.auth'), money(SELLER_AUTH_FEE_CHF)],
            [t('auth.fees.buyer'), money(0)]
          ]}
        />
        <p style={{ margin: '14px 0 0', fontSize: 14.5, lineHeight: 1.55, color: 'var(--text-2)' }}>{t('auth.fees.region')}</p>
      </section>

      <section style={{ marginTop: 'clamp(40px,6vw,72px)' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 'clamp(24px,2.8vw,32px)', fontWeight: 800, fontStretch: '78%', textTransform: 'uppercase' }}>{t('auth.questions')}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {FAQ.map((f) => (
            <details key={f.q} style={{ padding: '16px 18px', borderRadius: 14, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>{t(f.q)}</summary>
              <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.55, color: 'var(--text-2)' }}>{t(f.a, { fee: money(BUYER_SHIPPING_CHF) })}</p>
            </details>
          ))}
        </div>
      </section>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 40 }}>
        <ButtonLink to="/market">{t('auth.browse')}</ButtonLink>
        <ButtonLink to="/sell" variant="secondary">
          {t('auth.sell')}
        </ButtonLink>
      </div>
    </main>
  );
}
