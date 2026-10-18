// Messages: every inquiry about a collector's piece, received and sent, in
// one place (opened from the header). Answer, ignore or open the shirt to
// offers right here.
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { Page } from '../../ui/index.ts';
import { InquiriesPanel } from '../vault/InquiriesPanel.tsx';

export default function MessagesPage() {
  const { t } = usePrefs();
  usePageMeta(t('msg.title'));
  return (
    <Page narrow>
      <h1 className="display" style={{ fontSize: 'clamp(30px,4.2vw,44px)' }}>
        {t('msg.title')}
      </h1>
      <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text-2)' }}>{t('msg.lede')}</p>
      <InquiriesPanel page />
    </Page>
  );
}
