// Step 1 of adding a shirt: a photo of the front and one of the back.
// Recognition (identify-shirt) names the shirt, reads the article code,
// judges the visible condition and prefills the rest of the wizard.
import { BY } from '../../../data.ts';
import { usePrefs } from '../../../lib/prefs.tsx';
import { Badge, Button, Card, Notice } from '../../../ui/index.ts';
import { useState } from 'react';
import { Link } from 'react-router';
import { GuidedCapture } from './GuidedCapture.tsx';
import { PhotoInput, Section } from './parts.tsx';
import type { Wizard } from './useAddShirtForm.ts';
import type { Valuation } from '../../../types/domain.ts';
import { AI_MATCH_THRESHOLD, libraryPatch, proposedName } from '../../identify/prefill.ts';
import { variantLabel } from '../../library/model.ts';
import { usePhotoUrls } from '../../../lib/usePhotoUrls.ts';
import type { StudioState } from './studio.ts';

type Key = 'front' | 'back';

function StudioPreview({ w, studio, onStudioOff }: { w: Wizard; studio: StudioState; onStudioOff: (off: boolean) => void }) {
  const { t } = usePrefs();
  const { f } = w;
  const src = usePhotoUrls([f.photos.front_studio])(f.photos.front_studio);
  if (!f.photos.front) return null;
  const note = { off: 'as.studio.off', limited: 'as.studio.limited', failed: 'as.studio.failed' }[studio as 'off' | 'limited' | 'failed'];
  return (
    <Section title={t('as.studio.title')} hint={t('as.studio.body')}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ width: 160, height: 160, borderRadius: 16, overflow: 'hidden', background: 'var(--sunken)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', flex: 'none' }}>
          {studio === 'working' ? (
            <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-fill)', animation: 'kvPulse 1.2s ease-in-out infinite' }} />
          ) : src && !f.studioOff ? (
            <img src={src} alt={t('as.photo.studio')} className="shirt-photo" style={{ width: '86%', height: '86%', objectFit: 'contain' }} />
          ) : (
            <span style={{ fontSize: 12, color: 'var(--muted)', padding: 12, textAlign: 'center' }}>—</span>
          )}
        </div>
        <div style={{ flex: '1 1 200px', minWidth: 0 }} aria-live="polite">
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={!f.studioOff} onChange={(e) => onStudioOff(!e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--accent)' }} />
            {t('as.studio.use')}
          </label>
          {studio === 'working' && <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 8 }}>{t('as.studio.working')}</p>}
          {note && !f.studioOff && (
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8, lineHeight: 1.45 }}>
              {t(note)}{' '}
              {studio === 'failed' && (
                <button type="button" className="link-btn" onClick={() => onStudioOff(false)}>
                  {t('as.studio.retry')}
                </button>
              )}
            </p>
          )}
        </div>
      </div>
    </Section>
  );
}

export function ScanStep({ w, busyKey, onScanFile, valuation, studio, onStudioOff }: { w: Wizard; busyKey: string | null; onScanFile: (key: Key, f: File) => Promise<void> | void; valuation: Valuation; studio: StudioState; onStudioOff: (off: boolean) => void }) {
  const { money, t } = usePrefs();
  const [framed, setFramed] = useState<Key | null>(null);
  const { f } = w;
  const r = f.scan.result;
  const catalogItem = f.catalogId ? BY[f.catalogId] : undefined;
  const maybe = r?.catalogId && r.confidence < AI_MATCH_THRESHOLD && !f.catalogId ? BY[r.catalogId] : undefined;
  const kitLabel = (k: string) => t('kit.' + k);
  const busy = f.scan.status === 'scanning';
  // Found among the library's kits (not one of the catalogue shirts) — by the
  // recognition or picked by the member from the closest ones: shown by name and picture.
  const options = r?.libraryCandidates ?? [];
  const lib = (!catalogItem && !maybe && [r?.libraryKit, ...options].find((k) => k && k.id === f.kitId)) || null;
  const kitName = (k: NonNullable<typeof lib>) => `${k.clubName} ${k.season} · ${t('lib.kind.' + k.kind)}${k.variant ? ' · ' + variantLabel(k.variant, t) : ''}`;
  const libName = lib ? kitName(lib) : '';
  const others = options.filter((k) => k.id !== lib?.id);
  const pick = (k: (typeof options)[number]) => w.set(libraryPatch(k, kitLabel));

  return (
    <div>
      <Section title={t('as.scan.title')} hint={t('as.scan.hint')}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {(['front', 'back'] as const).map((key) => (
            <div key={key} style={{ display: 'grid', justifyItems: 'center', gap: 6 }}>
              {/* Front and back are always taken in the frame, so every collection photo looks alike. */}
              <PhotoInput size={112} data={f.photos[key]} busy={busyKey === key} onFile={(file) => onScanFile(key, file)} label={t('as.scan.' + key)} guided={() => setFramed(key)} />
              <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{t('as.scan.' + key)}</span>
            </div>
          ))}
        </div>
        {framed && (
          <GuidedCapture
            specs={[{ key: framed, label: t('as.scan.' + framed), hint: t('gc.flatHint') }]}
            photos={f.photos}
            startKey={framed}
            onShot={async (_spec, file) => {
              await onScanFile(framed, file);
              setFramed(null);
              return null;
            }}
            onClose={() => setFramed(null)}
          />
        )}
        <p style={{ margin: '14px 0 0', fontSize: 13.5 }}>
          <Link to="/vault/add/library">{t('qa.entry')} ›</Link>
        </p>
        <div aria-live="polite" style={{ marginTop: 16 }}>
          {f.scan.status === 'idle' && !f.photos.front && !f.photos.back && <p style={{ fontSize: 13.5, color: 'var(--muted)' }}>{t('as.scan.idle')}</p>}
          {f.scan.status === 'idle' && !f.photos.front !== !f.photos.back && <p style={{ fontSize: 13.5, color: 'var(--text-2)' }}>{t(f.photos.front ? 'as.scan.nowBack' : 'as.scan.nowFront')}</p>}
          {busy && (
            <p style={{ fontSize: 13.5, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-fill)', animation: 'kvPulse 1.2s ease-in-out infinite' }} />
              {t('as.scan.scanning')}
            </p>
          )}
          {f.scan.status === 'error' && <Notice tone="warn">{t('as.scan.error')}</Notice>}
          {f.scan.status === 'off' && <Notice tone="info">{t('as.scan.off')}</Notice>}
          {f.scan.status === 'limited' && <Notice tone="info">{t('as.scan.limited')}</Notice>}
        </div>
      </Section>

      <StudioPreview w={w} studio={studio} onStudioOff={onStudioOff} />

      {f.scan.status === 'done' && r && !r.isShirt && <Notice tone="warn">{t('as.scan.notShirt')}</Notice>}

      {f.scan.status === 'done' && r?.isShirt && (
        <Card tight accent={!!catalogItem || !!lib} style={{ marginBottom: 20, animation: 'kvIn .3s ease both' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <div className="mono" style={{ fontSize: 11, color: catalogItem || lib ? 'var(--accent)' : 'var(--muted)' }}>
              {catalogItem ? t('as.scan.match') : lib ? t('as.scan.inLibrary') : maybe ? t('as.scan.maybe') : t('as.scan.notInCatalogue')}
            </div>
            <Badge tone={r.confidence >= AI_MATCH_THRESHOLD ? 'accent' : 'neutral'}>{t('as.scan.sure', { p: Math.round(r.confidence * 100) })}</Badge>
          </div>
          {lib ? (
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 8 }}>
              <span className="kit-thumb" style={{ width: 84, height: 84, borderRadius: 14, display: 'grid', placeItems: 'center', flex: 'none' }}>
                <img src={lib.image} alt="" style={{ width: '86%', height: '86%', objectFit: 'contain' }} />
              </span>
              <div style={{ fontWeight: 700, fontSize: 18, lineHeight: 1.3 }}>{libName}</div>
            </div>
          ) : (
            <div style={{ fontWeight: 700, fontSize: 18, marginTop: 6 }}>{catalogItem?.name ?? maybe?.name ?? (proposedName(r, kitLabel) || r.summary)}</div>
          )}
          {lib && r.summary && <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '10px 0 0', lineHeight: 1.45 }}>{r.summary}</p>}
          {!catalogItem && !maybe && others.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{t(lib ? 'as.scan.notThis' : 'as.scan.whichOne')}</div>
              {!lib && <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '2px 0 0' }}>{t('as.scan.whichHint')}</p>}
              <ul className="kit-picks" aria-label={t('as.scan.whichOne')}>
                {others.map((k) => (
                  <li key={k.id}>
                    <button type="button" className="kit-pick" onClick={() => pick(k)} aria-label={kitName(k)}>
                      <span className="kit-thumb kit-pick__art">
                        <img src={k.image} alt="" loading="lazy" />
                      </span>
                      <span className="kit-pick__name">
                        {k.season} · {t('lib.kind.' + k.kind)}
                        {k.variant ? ' · ' + variantLabel(k.variant, t) : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
          {!catalogItem && !maybe && !lib && <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 10 }}>{t('as.scan.newShirtBody')}</p>}
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
