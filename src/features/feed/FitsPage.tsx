// Feed → Fits: blokecore outfits from Maillot's Pinterest board — how people
// wear football shirts — with a way to find such a shirt in the library.
import { Link, Navigate } from 'react-router';
import { PINTEREST_BOARD } from '../../config/site.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { Page } from '../../ui/index.ts';
import { FeedTabs } from './FeedTabs.tsx';
import { PinterestBoard } from './PinterestBoard.tsx';

export default function FitsPage() {
  const { t } = usePrefs();
  usePageMeta(t('fits.meta'), t('fits.intro'));
  if (!PINTEREST_BOARD) return <Navigate to="/feed" replace />;
  return (
    <>
      <FeedTabs />
      <Page>
        <h1 className="display" style={{ fontSize: 'clamp(28px,4.4vw,44px)', margin: 0 }}>
          {t('fits.title')}
        </h1>
        <p style={{ color: 'var(--text-2)', margin: '8px 0 18px', fontSize: 15, lineHeight: 1.5, maxWidth: 640 }}>
          {t('fits.intro')} <Link to="/library/find?era=retro">{t('fits.find')} ›</Link>
        </p>
        <PinterestBoard url={PINTEREST_BOARD} />
      </Page>
    </>
  );
}
