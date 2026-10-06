import { useState } from 'react';
import type { Shirt } from '../../../data.ts';
import { ShirtGraphic, alpha } from '../../../ui/index.ts';
import { usePrefs } from '../../../lib/prefs.tsx';
import { tagFor } from '../../catalog/model.ts';

const VIEWS = ['Front', 'Back', 'Crest', 'Wash tag'] as const;
type View = (typeof VIEWS)[number];

export function Gallery({ s }: { s: Shirt }) {
  const [view, setView] = useState<View>('Front');
  // Views fade in when switched; the first front view arrives by view transition instead.
  const [switched, setSwitched] = useState(false);
  const enter = switched ? 'kvIn .35s ease both' : undefined;
  const { t } = usePrefs();
  const parts = (s.player || '').split(' ');
  const printNumber = parts.length > 1 ? parts[parts.length - 1] : '';
  const printName = parts.slice(0, -1).join(' ').toUpperCase();

  return (
    <div style={{ flex: '1 1 480px', minWidth: 0 }}>
      <div
        data-gallery
        role="img"
        aria-label={t('gal.aria', { name: s.name, view: t('gal.view.' + view).toLowerCase() })}
        style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 28, border: '1px solid var(--line)', background: `radial-gradient(circle at 50% 44%,${alpha(s.glow, 0.34)} 0%,rgba(0,0,0,0) 60%),linear-gradient(180deg,var(--surface-2),var(--bg-deep))`, display: 'grid', placeItems: 'center', overflow: 'hidden' }}
      >
        <span className="badge badge--accent" style={{ position: 'absolute', top: 18, left: 18, zIndex: 2, padding: '7px 12px', background: 'var(--overlay)', border: '1px solid var(--accent-line)', fontFamily: 'var(--font-sans)', fontSize: 12.5 }}>
          {t('gal.authenticated')}
        </span>
        <span className="badge badge--neutral" style={{ position: 'absolute', top: 18, right: 18, zIndex: 2, padding: '7px 12px', background: 'var(--overlay)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {t(tagFor(s))}
        </span>
        {view === 'Front' && <ShirtGraphic hero pat={s.pat} trim={s.trim} crest={s.crest} style={{ width: '68%', filter: 'drop-shadow(0 40px 40px rgba(0,0,0,0.6))', animation: enter, viewTransitionName: 'shirt-hero' }} />}
        {view === 'Back' && (
          <ShirtGraphic view="back" pat={s.pat} trim={s.trim} crest={s.crest} num={s.num} printName={printName} printNumber={printNumber} style={{ width: '68%', filter: 'drop-shadow(0 40px 40px rgba(0,0,0,0.6))', animation: enter }} />
        )}
        {view === 'Crest' && <ShirtGraphic view="crest" pat={s.pat} trim={s.trim} crest={s.crest} style={{ animation: enter }} />}
        {view === 'Wash tag' && (
          <div className="mono" style={{ width: '62%', aspectRatio: '3/4', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.2)', background: 'repeating-linear-gradient(135deg,rgba(255,255,255,0.035) 0 10px,rgba(255,255,255,0) 10px 20px)', display: 'grid', placeItems: 'center', fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: 20 }}>
            {t('gal.washTag')}
          </div>
        )}
      </div>
      <div role="group" aria-label={t('gal.views')} style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        {VIEWS.map((v) => (
          <button key={v} type="button" className="option-btn" aria-pressed={view === v} onClick={() => {
              setView(v);
              setSwitched(true);
            }} style={{ flex: 1, maxWidth: 120, height: 64, borderRadius: 14, fontSize: 12, color: 'var(--text-2)', textAlign: 'center' }}>
            {t('gal.view.' + v)}
          </button>
        ))}
      </div>
    </div>
  );
}
