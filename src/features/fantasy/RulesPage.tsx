// The official rules of Fantasy — a free skill game, no stakes. Placeholder
// text until legal counsel has reviewed it (config/company.ts has the dates).
import { Link } from 'react-router';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { Notice, Page } from '../../ui/index.ts';

export default function RulesPage() {
  const { t } = usePrefs();
  usePageMeta(t('fantasy.rules.title') + ' · Fantasy', t('fantasy.rules.intro'));
  return (
    <Page narrow>
      <Link to="/fantasy" className="btn btn--ghost btn--sm" style={{ marginBottom: 16 }}>
        ← Fantasy
      </Link>
      <h1 className="display" style={{ fontSize: 'clamp(28px,4vw,40px)', margin: 0 }}>
        {t('fantasy.rules.title')}
      </h1>
      <Notice tone="warn" style={{ marginTop: 14 }}>
        {t('fantasy.rules.placeholder')}
      </Notice>
      <p style={{ color: 'var(--text-2)', marginTop: 14, lineHeight: 1.6 }}>{t('fantasy.rules.intro')}</p>
      <ol style={{ margin: '14px 0 0', paddingLeft: 20, display: 'grid', gap: 10, lineHeight: 1.6, fontSize: 15 }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <li key={i}>{t('fantasy.rules.' + i)}</li>
        ))}
      </ol>
      <p style={{ margin: '18px 0 0', fontSize: 13, color: 'var(--muted)' }}>
        <Link to="/legal/terms">{t('footer.terms')}</Link> · <Link to="/legal/privacy">{t('footer.privacy')}</Link>
      </p>
    </Page>
  );
}
