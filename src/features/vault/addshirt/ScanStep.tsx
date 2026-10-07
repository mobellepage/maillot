// Step 1 of adding a shirt: a photo of the front and one of the inner label.
// Recognition (identify-shirt) names the shirt, reads the article code,
// judges the visible condition and prefills the rest of the wizard.
import { BY } from '../../../data.ts';
import { usePrefs } from '../../../lib/prefs.tsx';
import { Badge, Button, Card, Notice } from '../../../ui/index.ts';
import { PhotoInput, Section } from './parts.tsx';
import type { Wizard } from './useAddShirtForm.ts';
import type { Valuation } from '../../../types/domain.ts';
import { AI_MATCH_THRESHOLD, proposedName } from '../../identify/prefill.ts';

type Key = 'front' | 'product_code';

export function ScanStep({ w, busyKey, onScanFile, valuation }: { w: Wizard; busyKey: string | null; onScanFile: (key: Key, f: File) => void; valuation: Valuation }) {
  const { money, t } = usePrefs();
  const { f } = w;
  const r = f.scan.result;
  const catalogItem = f.catalogId ? BY[f.catalogId] : undefined;
  const maybe = r?.catalogId && r.confidence < AI_MATCH_THRESHOLD && !f.catalogId ? BY[r.catalogId] : undefined;
  const kitLabel = (k: string) => t('kit.' + k);
  const busy = f.scan.status === 'scanning';

  return (
    <div>
      <Section title={t('as.scan.title')} hint={t('as.scan.hint')}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {(['front', 'product_code'] as const).map((key) => (
            <div key={key} style={{ display: 'grid', justifyItems: 'center', gap: 6 }}>
              <PhotoInput size={112} data={f.photos[key]} busy={busyKey === key} onFile={(file) => onScanFile(key, file)} label={t(key === 'front' ? 'as.scan.front' : 'as.scan.label')} />
              <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{t(key === 'front' ? 'as.scan.front' : 'as.scan.label')}</span>
            </div>
          ))}
        </div>
        <div aria-live="polite" style={{ marginTop: 16 }}>
          {f.scan.status === 'idle' && !f.photos.front && !f.photos.product_code && <p style={{ fontSize: 13.5, color: 'var(--muted)' }}>{t('as.scan.idle')}</p>}
          {busy && (
            <p style={{ fontSize: 13.5, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', animation: 'kvPulse 1.2s ease-in-out infinite' }} />
              {t('as.scan.scanning')}
            </p>
          )}
          {f.scan.status === 'error' && <Notice tone="warn">{t('as.scan.error')}</Notice>}
          {f.scan.status === 'off' && <Notice tone="info">{t('as.scan.off')}</Notice>}
          {f.scan.status === 'limited' && <Notice tone="info">{t('as.scan.limited')}</Notice>}
        </div>
      </Section>

      {f.scan.status === 'done' && r && !r.isShirt && <Notice tone="warn">{t('as.scan.notShirt')}</Notice>}

      {f.scan.status === 'done' && r?.isShirt && (
        <Card tight accent={!!catalogItem} style={{ marginBottom: 20, animation: 'kvIn .3s ease both' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <div className="mono" style={{ fontSize: 11, color: catalogItem ? 'var(--accent)' : 'var(--muted)' }}>
              {catalogItem ? t('as.scan.match') : maybe ? t('as.scan.maybe') : t('as.scan.notInCatalogue')}
            </div>
            <Badge tone={r.confidence >= AI_MATCH_THRESHOLD ? 'accent' : 'neutral'}>{t('as.scan.sure', { p: Math.round(r.confidence * 100) })}</Badge>
          </div>
          <div style={{ fontWeight: 700, fontSize: 18, marginTop: 6 }}>{catalogItem?.name ?? maybe?.name ?? (proposedName(r, kitLabel) || r.summary)}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            {[r.brand, r.kit !== 'unknown' ? kitLabel(r.kit) : null, r.productCode && `${t('as.scan.code')} ${r.productCode}`, r.labelSize, [r.playerName, r.playerNumber].filter(Boolean).join(' ')]
              .filter(Boolean)
              .map((x) => (
                <Badge key={x as string} tone="neutral">
                  {x}
                </Badge>
              ))}
          </div>

          {catalogItem && !valuation.blocked && (
            <div className="mono" style={{ fontSize: 22, fontWeight: 700, marginTop: 14 }}>
              {money(valuation.low)} – {money(valuation.high)}
            </div>
          )}
          {!catalogItem && !maybe && <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 10 }}>{t('as.scan.newShirtBody')}</p>}
          {maybe && (
            <Button size="sm" variant="secondary" style={{ marginTop: 12 }} onClick={() => w.set({ catalogId: maybe.id, proposed: false, searchQ: maybe.name })}>
              {t('as.scan.thatsIt')}
            </Button>
          )}

          {r.condition.grade !== 'unknown' && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('as.scan.condition')}</div>
              <div style={{ fontWeight: 600, marginTop: 2 }}>{t('grade.' + r.condition.grade)}</div>
              {r.condition.notes.length > 0 && (
                <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
                  {r.condition.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {r.authenticityConcerns.length > 0 && (
            <Notice tone="warn" style={{ marginTop: 16 }}>
              <strong>{t('as.scan.concerns')}</strong>
              <ul style={{ margin: '6px 0', paddingLeft: 18, lineHeight: 1.5 }}>
                {r.authenticityConcerns.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <span style={{ fontSize: 12.5 }}>{t('as.scan.concernsNote')}</span>
            </Notice>
          )}
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12 }}>{t('as.scan.rough')}</div>
        </Card>
      )}
      {f.scan.status === 'done' && r?.isShirt && !catalogItem && !maybe && !r.club && <Notice tone="info">{t('as.scan.noMatch')}</Notice>}
    </div>
  );
}
