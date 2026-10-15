// The promise comes last for visitors: after they've used the app, the
// slogan, the fanned-out shirts and the way to start (and the app stores).
import { BY } from '../../data.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { StoreBadges } from '../../app/StoreBadges.tsx';
import { ButtonLink } from '../../ui/index.ts';
import { HeroCards } from './Hero.tsx';
import { HeroStats } from './HeroStats.tsx';

export function Outro() {
  const { t } = usePrefs();
  return (
    <section aria-labelledby="outro-title" style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(56px,7vw,104px) var(--gutter) clamp(40px,6vw,80px)', textAlign: 'center' }}>
      <h2 id="outro-title" className="display display--xl" style={{ fontWeight: 800, fontSize: 'clamp(38px,6vw,76px)', margin: '0 auto', maxWidth: 900, textWrap: 'balance' }}>
        {t('home.h1a')}
        <br />
        <span className="hero-accent" style={{ color: 'var(--accent)' }}>
          {t('home.h1b')}
        </span>
      </h2>
      <p className="lede" style={{ margin: '18px auto 0', maxWidth: 560, fontSize: 'clamp(18px,2vw,23px)', textWrap: 'balance' }}>
        {t('home.lede')}
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 28 }}>
        <ButtonLink to="/vault/add" size="lg">
          {t('home.cta.start')}
        </ButtonLink>
        <ButtonLink to="/market" size="lg" variant="secondary">
          {t('home.find.toMarket')}
        </ButtonLink>
      </div>
      <div style={{ marginTop: 18 }}>
        <StoreBadges />
      </div>
      <HeroCards featured={BY['ger-26']!} />
      <HeroStats />
    </section>
  );
}
