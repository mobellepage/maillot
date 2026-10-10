import { PROTOTYPE } from '../config/site.ts';
import { usePrefs } from '../lib/prefs.tsx';

/** While MAILLOT is a prototype: pictures, prices and figures are examples. */
export function PrototypeBar() {
  const { t } = usePrefs();
  if (!PROTOTYPE) return null;
  return (
    <div className="mono" style={{ padding: '6px var(--gutter)', textAlign: 'center', fontSize: 11.5, letterSpacing: '0.04em', color: 'var(--text-2)', background: 'var(--sunken)', borderBottom: '1px solid var(--line)' }}>
      <strong style={{ color: 'var(--accent)', fontWeight: 600 }}>{t('proto.label')}</strong> · {t('proto.body')}
    </div>
  );
}
