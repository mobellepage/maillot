import { VISIBILITIES, missingSalePhotos } from '../../../addShirtData.js';
import { usePrefs } from '../../../lib/prefs.tsx';
import type { Valuation, Visibility } from '../../../types/domain.ts';
import { Button, Card, Notice } from '../../../ui/index.ts';
import { Section } from './parts.tsx';
import { inputStyle } from './styles.ts';
import { chosenVisibility, type Wizard } from './useAddShirtForm.ts';
import { useSession } from '../../../lib/session.tsx';
import { PUBLIC_VALUE_HINT } from '../../../config/rules.ts';

export function FinishStep({ w, valuation, onSave, saving }: { w: Wizard; valuation: Valuation; onSave: () => void; saving: boolean }) {
  const { money, t, label } = usePrefs();
  const { f, set } = w;
  const { profile } = useSession();
  const visibility = chosenVisibility(f, profile?.collectionPrivate);
  // Listed with front and back only: "self-reported"; the pre-check photos make it "pre-checked".
  const missing = visibility === 'forsale' || visibility === 'offers' ? (missingSalePhotos(f.photos, f.flock.source) as string[]) : [];
  return (
    <div>
      <Section title={t('as.f.estimate')}>
        {valuation.blocked ? (
          <Notice tone="warn">{t(valuation.reason ?? '')}</Notice>
        ) : (
          <Card tight style={{ padding: 20, borderRadius: 18 }}>
            <div className="mono" style={{ fontSize: 30, fontWeight: 700 }}>
              {money(valuation.low)} – {money(valuation.high)}
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--text-2)', marginTop: 6 }}>
              {t('as.f.confidence', { mid: money(valuation.mid), c: label('opt', valuation.confidence ?? '') })}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>{valuation.basis ? t(valuation.basis.key, valuation.basis.vars) : valuation.basisText}</div>
          </Card>
        )}
      </Section>
      <Section title={t('as.f.visibility')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(VISIBILITIES as { key: Visibility; label: string; desc: string }[]).map((o) => (
            <button key={o.key} type="button" className="option-btn" aria-pressed={visibility === o.key} onClick={() => set({ visibility: o.key })} style={{ padding: 14 }}>
              <span style={{ display: 'block', fontWeight: 600, fontSize: 14 }}>{t(o.label)}</span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>{t(o.desc)}</span>
            </button>
          ))}
        </div>
        {profile?.collectionPrivate && visibility !== 'private' && <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '8px 0 0' }}>{t('as.vis.collectionPrivate')}</p>}
        {/* A valuable shirt in public: a gentle reminder that private is one tap away. */}
        {!profile?.collectionPrivate && visibility !== 'private' && !valuation.blocked && (valuation.mid ?? 0) >= PUBLIC_VALUE_HINT && (
          <Notice tone="info" style={{ marginTop: 10 }}>
            {t('as.vis.valuableHint')}
          </Notice>
        )}
        {visibility === 'forsale' && (
          <input aria-label={t('as.f.price')} inputMode="numeric" value={f.salePrice} onChange={(e) => set({ salePrice: e.target.value.replace(/[^0-9]/g, '') })} placeholder={valuation.blocked ? t('as.f.price') : t('as.f.pricePh', { mid: valuation.mid })} style={{ ...inputStyle, marginTop: 10 }} />
        )}
        {missing.length > 0 && (
          <Notice tone="info" style={{ marginTop: 12 }}>
            {t('as.f.precheckPhotos', { list: missing.map((k) => t('as.photo.' + k)).join(', ') })}{' '}
            <button type="button" className="link-btn" onClick={() => {
                set({ goal: 'sale', step: 3 });
                window.scrollTo(0, 0);
              }}>
              {t('as.f.addPhotos')}
            </button>
          </Notice>
        )}
      </Section>
      <Button block size="lg" busy={saving} busyLabel={t('as.f.saving')} disabled={visibility === 'forsale' && !(Number(f.salePrice) > 0)} onClick={onSave}>
        {t('as.f.save')}
      </Button>
    </div>
  );
}
