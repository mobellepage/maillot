import { BY } from '../../../data.ts';
import { usePrefs } from '../../../lib/prefs.tsx';
import { Button, Card, Notice } from '../../../ui/index.ts';
import { PhotoInput, Section } from './parts.tsx';
import type { Wizard } from './useAddShirtForm.ts';
import type { Valuation } from '../../../types/domain.ts';

export function ScanStep({ w, busy, onScanFile, valuation }: { w: Wizard; busy: boolean; onScanFile: (f: File) => void; valuation: Valuation }) {
  const { money, t } = usePrefs();
  const { f } = w;
  const catalogItem = f.catalogId ? BY[f.catalogId] : undefined;
  const weak = f.scan.status === 'done' && f.scan.matchId && !f.catalogId ? BY[f.scan.matchId] : undefined;
  return (
    <div>
      <Section title={t('as.scan.title')} hint={t('as.scan.hint')}>
        <Card tight style={{ display: 'flex', gap: 14, alignItems: 'flex-start', borderRadius: 18 }}>
          <PhotoInput size={96} data={f.photos.product_code} busy={busy} onFile={onScanFile} label={t('as.scan.title')} />
          <div style={{ flex: 1, minWidth: 0 }} aria-live="polite">
            {f.scan.status === 'idle' && <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>{t('as.scan.idle')}</div>}
            {f.scan.status === 'scanning' && <div style={{ fontSize: 13.5, color: 'var(--text-2)' }}>{t('as.scan.scanning')}</div>}
            {f.scan.status === 'error' && <div style={{ fontSize: 13.5, color: 'var(--neg)' }}>{t('as.scan.error')}</div>}
            {f.scan.status === 'done' && (
              <>
                <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
                  {t('as.scan.text')}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', wordBreak: 'break-word' }}>{f.scan.ocrText || t('as.scan.noText')}</div>
              </>
            )}
          </div>
        </Card>
      </Section>
      {f.scan.status === 'done' && catalogItem && f.scan.matchId === f.catalogId && (
        <Card tight accent style={{ marginBottom: 20, animation: 'kvIn .3s ease both' }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 4 }}>
            {t('as.scan.match')}
          </div>
          <div style={{ fontWeight: 600 }}>{catalogItem.name}</div>
          {!valuation.blocked && (
            <div className="mono" style={{ fontSize: 20, fontWeight: 700, marginTop: 8 }}>
              {money(valuation.low)} – {money(valuation.high)}
            </div>
          )}
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{t('as.scan.rough')}</div>
        </Card>
      )}
      {weak && (
        <Card tight style={{ marginBottom: 20 }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
            {t('as.scan.maybe')}
          </div>
          <div style={{ fontWeight: 600 }}>{weak.name}</div>
          <Button size="sm" variant="secondary" style={{ marginTop: 10 }} onClick={() => w.set({ catalogId: weak.id, proposed: false, searchQ: weak.name })}>
            {t('as.scan.thatsIt')}
          </Button>
        </Card>
      )}
      {f.scan.status !== 'idle' && f.scan.status !== 'scanning' && !catalogItem && !weak && <Notice tone="info">{t('as.scan.noMatch')}</Notice>}
    </div>
  );
}
