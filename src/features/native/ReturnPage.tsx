// /return?to=/orders?checkout=success — where Stripe sends people who paid or
// set up payouts from the iOS app. It opens in the app's browser sheet; this
// page hands over to the app via maillot://, which closes the sheet and opens
// the right screen. Visited in a normal browser it just offers both ways on.
import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { appPathFromUrl } from '../../lib/native.ts';
import { Card, Page } from '../../ui/index.ts';

export default function ReturnPage() {
  const { t } = usePrefs();
  usePageMeta(t('ret.title'));
  const [params] = useSearchParams();
  // Only in-app paths; anything else falls back to the start page.
  const to = appPathFromUrl('maillot:/' + (params.get('to') || '/')) ?? '/';
  const appLink = 'maillot:/' + to;

  useEffect(() => {
    window.location.href = appLink;
  }, [appLink]);

  return (
    <Page narrow>
      <Card style={{ marginTop: 'clamp(24px,8vw,72px)', textAlign: 'center', padding: 'clamp(24px,5vw,40px)' }}>
        <h1 className="display" style={{ fontSize: 'clamp(26px,5vw,34px)' }}>
          {t('ret.title')}
        </h1>
        <p style={{ color: 'var(--text-2)', margin: '12px 0 24px', lineHeight: 1.55 }}>{t('ret.body')}</p>
        <a href={appLink} className="btn btn--primary btn--lg btn--block">
          {t('ret.open')}
        </a>
        <p style={{ marginTop: 16, fontSize: 14 }}>
          <Link to={to}>{t('ret.web')}</Link>
        </p>
      </Card>
    </Page>
  );
}
