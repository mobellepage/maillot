// The promise in three steps: capture your collection, have it with you,
// then find shirts and get offers. Collection first, market second.
import { Link } from 'react-router';
import { usePrefs } from '../../lib/prefs.tsx';
import { ButtonLink, Card } from '../../ui/index.ts';

const STEPS = [
  ['home.how.capture.title', 'home.how.capture.body'],
  ['home.how.carry.title', 'home.how.carry.body'],
  ['home.how.find.title', 'home.how.find.body']
] as const;

export function HowItWorks() {
  const { t } = usePrefs();
  return (
    <section aria-labelledby="how-title" style={{ maxWidth: 1360, margin: '0 auto', padding: 'clamp(40px,5vw,72px) var(--gutter) 0' }}>
      <div className="eyebrow">{t('home.how.eyebrow')}</div>
      <h2 id="how-title" className="display" style={{ fontSize: 'clamp(26px,3.6vw,40px)', margin: '8px 0 24px' }}>
        {t('home.how.title')}
      </h2>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,280px),1fr))' }}>
        {STEPS.map(([title, body], i) => (
          <li key={title}>
            <Card style={{ height: '100%', padding: 22 }}>
              <span className="mono" aria-hidden="true" style={{ width: 34, height: 34, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 700 }}>
                {i + 1}
              </span>
              <h3 style={{ margin: '14px 0 6px', fontSize: 18 }}>{t(title)}</h3>
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: 'var(--text-2)' }}>{t(body)}</p>
            </Card>
          </li>
        ))}
      </ol>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
        <ButtonLink to="/vault/add">{t('home.cta.start')}</ButtonLink>
        <Link to="/feed" className="btn btn--ghost">
          {t('home.how.browse')}
        </Link>
      </div>
    </section>
  );
}
