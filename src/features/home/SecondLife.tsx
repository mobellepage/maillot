// Why second hand: a worn shirt carries a story a new one from the shop
// doesn't — give shirts a second life in your collection.
import { usePrefs } from '../../lib/prefs.tsx';
import { ButtonLink } from '../../ui/index.ts';

export function SecondLife() {
  const { t } = usePrefs();
  return (
    <section aria-labelledby="second-life-title" style={{ maxWidth: 1360, margin: '0 auto', padding: 'clamp(48px,6vw,88px) var(--gutter) 0' }}>
      <div style={{ borderRadius: 28, padding: 'clamp(28px,5vw,56px)', border: '1px solid var(--line)', background: 'radial-gradient(ellipse 70% 90% at 0% 0%,rgba(75,255,139,0.12),rgba(0,0,0,0) 60%),var(--surface)' }}>
        <div className="eyebrow">{t('home.second.eyebrow')}</div>
        <h2 id="second-life-title" className="display" style={{ fontSize: 'clamp(28px,4.2vw,48px)', margin: '10px 0 16px', maxWidth: 760 }}>
          {t('home.second.title')}
        </h2>
        <p className="lede" style={{ margin: 0, maxWidth: 640 }}>
          {t('home.second.body')}
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>
          <ButtonLink to="/vault/add">{t('home.second.add')}</ButtonLink>
          <ButtonLink to="/market" variant="secondary">
            {t('home.second.find')}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
