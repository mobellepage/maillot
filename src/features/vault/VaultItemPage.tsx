import { useState } from 'react';
import { useCatalog } from '../catalog/useCatalog.ts';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { pct } from '../../data.ts';
import { formatDate } from '../../lib/format.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { downloadVaultCard } from '../../utils/cardExport.js';
import { Badge, Button, Card, ErrorState, KeyValueList, Notice, Page, ShirtGraphic, Skeleton, HEX, useConfirm } from '../../ui/index.ts';
import { badgeFor, itemLook, itemName, valueOf } from './model.ts';
import { usePhotoUrls } from '../../lib/usePhotoUrls.ts';
import { currentValuation, displayStatus, useCollection, useCollectionActions } from './useCollection.ts';



export default function VaultItemPage() {
  useCatalog(); // re-render when the live catalogue loads
  const { id } = useParams();
  const { items, reviews, loading, error, refetch } = useCollection();
  const { retry, remove } = useCollectionActions();
  const confirm = useConfirm();
  const nav = useNavigate();
  const { money, lang, t, label } = usePrefs();
  const [photoIdx, setPhotoIdx] = useState(0);
  const c = items.find((x) => x.id === id);
  usePageMeta(c ? itemName(c) : t('vault.title.collection'));
  // The studio photo (if any) leads; the originals follow for the details.
  const entries = Object.entries(c?.photos || {}).sort(([a], [b]) => Number(b === 'front_studio') - Number(a === 'front_studio'));
  const fullUrl = usePhotoUrls(entries.map(([, p]) => p));
  const thumbUrl = usePhotoUrls(entries.map(([, p]) => p), true);
  if (loading)
    return (
      <Page narrow aria-busy="true">
        <Skeleton height={420} radius={24} />
      </Page>
    );
  if (error)
    return (
      <Page narrow>
        <ErrorState what={t('what.item')} onRetry={refetch} />
      </Page>
    );
  if (!c) return <Navigate to="/vault" replace />;

  const name = itemName(c);
  const badge = badgeFor(c);
  const { look, glow } = itemLook(c);
  const photos = entries.map(([key, p]) => ({ key, url: fullUrl(p), thumb: thumbUrl(p), label: p.label || key }));
  const photo = photos[photoIdx];
  const val = currentValuation(c);
  const from = c.initialValuation && !c.initialValuation.blocked ? c.initialValuation.mid : null;
  const to = valueOf(c);
  const change = from !== null && to !== null && from !== to ? ((to - from) / from) * 100 : null;
  const status = displayStatus(c, reviews);
  const flockLine = c.flock.source === 'Keine' ? t('vault.none') : label('opt', c.flock.source) + (c.flock.name ? ' · ' + c.flock.name : '') + (c.flock.number ? ' #' + c.flock.number : '') + (c.flock.type ? ' (' + label('opt', c.flock.type) + ')' : '');
  const sigLine = c.signature.signed ? t('vault.signedBy', { by: c.signature.by || t('vault.unknown') }) + (c.signature.hasCoa ? t('vault.coa', { issuer: c.signature.issuer || t('vault.unknown') }) : t('vault.noCoa')) : t('vault.notSigned');

  return (
    <Page narrow>
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <Link to="/vault" className="btn btn--ghost btn--sm">
          {t('vault.backToCollection')}
        </Link>
        <Button variant="ghost" size="sm" onClick={() => downloadVaultCard({ name, size: (c.sizeGroup || '') + ' ' + (c.size || ''), priceFmt: to !== null ? money(to) : '—', paid: t('vault.estimated'), gain: '', gainC: HEX.muted, glowA: glow, ...look, badgeLabel: t(badge.label), badgeColor: badge.color })}>
          {t('vault.exportImage')}
        </Button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28 }}>
        <div style={{ flex: '1 1 360px', minWidth: 0 }}>
          <div style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 24, overflow: 'hidden', background: photo?.url ? `url(${photo.url}) center/cover` : `radial-gradient(circle at 50% 45%,${glow},rgba(0,0,0,0) 62%),var(--sunken)`, border: '1px solid var(--line)', display: 'grid', placeItems: 'center' }} role="img" aria-label={photo ? photo.label : name}>
            {!photo?.url && <ShirtGraphic hero {...look} style={{ width: '58%' }} />}
            <Badge tone={badge.tone} title={t(badge.desc)} style={{ position: 'absolute', top: 14, left: 14 }}>
              {t(badge.label)}
            </Badge>
          </div>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '10px 0 0', lineHeight: 1.5 }}>{t(badge.desc)}</p>
          {photos.length > 0 && (
            <div role="group" aria-label={t('vault.photos')} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(64px,1fr))', gap: 8, marginTop: 10 }}>
              {photos.map((p, i) => (
                <button key={p.key} type="button" aria-label={p.label} aria-pressed={i === photoIdx} onClick={() => setPhotoIdx(i)} style={{ aspectRatio: '1/1', borderRadius: 10, border: `1.5px solid ${i === photoIdx ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`, background: p.thumb ? `url(${p.thumb}) center/cover` : 'var(--sunken)', cursor: 'pointer', padding: 0 }} />
              ))}
            </div>
          )}
        </div>
        <div style={{ flex: '1 1 380px', minWidth: 0 }}>
          <h1 className="display" style={{ fontSize: 'clamp(26px,3.4vw,36px)', lineHeight: 1.05 }}>
            {name}
          </h1>
          <Card tight style={{ marginTop: 18, padding: 20, borderRadius: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div className="mono" style={{ fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                {t('vault.estimated')}
              </div>
              {change !== null && <Badge tone={change >= 0 ? 'accent' : 'neg'}>{t('vault.sinceAddedBadge', { pct: pct(change) })}</Badge>}
            </div>
            {val && !val.blocked ? (
              <>
                <div className="mono" style={{ fontSize: 26, fontWeight: 700, marginTop: 6 }}>
                  {money(val.low)} – {money(val.high)}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
                  {t('vault.confidence', { mid: money(val.mid), c: val.confidence ? label('opt', val.confidence) : '—' })}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6 }}>{val.basis ? t(val.basis.key, val.basis.vars) : val.basisText}</div>
              </>
            ) : (
              <Notice tone="warn" style={{ marginTop: 8 }}>
                {val?.reason ? t(val.reason) : t('vault.noEstimate')}
              </Notice>
            )}
          </Card>
          {c.precheck && (
            <Notice tone={c.precheck.status === 'ok' ? 'accent' : c.precheck.status === 'review' ? 'warn' : 'neg'} style={{ marginTop: 14 }}>
              {c.precheck.status === 'ok' ? t('vault.precheck.ok') : c.precheck.status === 'review' ? t('vault.precheck.review') : t('vault.precheck.fake')}
            </Notice>
          )}
          {(status === 'angefragt' || status === 'in Prüfung' || status === 'abgelehnt') && (
            <Card tight style={{ marginTop: 14 }}>
              <div className="mono" style={{ fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
                {t('vault.expertVerification')}
              </div>
              {status === 'angefragt' && <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-2)' }}>{t('vault.requested')}</p>}
              {status === 'in Prüfung' && <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-2)' }}>{t('vault.reviewing')}</p>}
              {status === 'abgelehnt' && (
                <div style={{ fontSize: 13.5, color: 'var(--neg)', lineHeight: 1.5 }}>
                  {t('vault.rejectedReason', { reason: t(c.verification.reason) })}
                  <Button size="sm" variant="ghost" busy={retry.isPending} onClick={() => retry.mutate(c)} style={{ display: 'flex', marginTop: 10 }}>
                    {t('vault.resubmit')}
                  </Button>
                </div>
              )}
            </Card>
          )}
          <Card tight style={{ marginTop: 16 }}>
            <KeyValueList
              rows={[
                [t('vault.f.version'), c.version ? label('opt', c.version) : '—'],
                [t('vault.f.size'), [c.sizeGroup && label('opt', c.sizeGroup), c.size, c.sleeve && label('opt', c.sleeve)].filter(Boolean).join(' · ')],
                [t('vault.f.flock'), flockLine],
                [t('vault.f.patches'), c.patches.length ? c.patches.map((p) => label('opt', p)).join(', ') : t('vault.none')],
                [t('vault.f.signature'), sigLine],
                [t('vault.f.tags'), c.tagsAttached ? t('vault.yesBnwt') : t('vault.no')],
                [t('vault.f.condition'), c.condition.grade + '/10' + (c.condition.defects.length ? ' · ' + c.condition.defects.map((d) => label('opt', d)).join(', ') : '')],
                [t('vault.f.provenance'), c.provenance || '—'],
                [t('vault.f.visibility'), t('vault.vis.' + c.visibility) + (c.visibility === 'forsale' && c.salePrice ? ' · ' + money(Number(c.salePrice)) : '')],
                [t('vault.f.added'), formatDate(c.createdAt, lang)]
              ]}
            />
          </Card>
        </div>
      </div>
      <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
        <Button
          variant="ghost"
          size="sm"
          busy={remove.isPending}
          busyLabel={t('vault.removing')}
          onClick={async () => {
            const ok = await confirm({ title: t('vault.removeTitle'), body: t('vault.removeBody', { name }), confirmLabel: t('vault.removeConfirm'), tone: 'danger' });
            if (ok) remove.mutate(c, { onSuccess: () => nav('/vault') });
          }}
          style={{ color: 'var(--neg)' }}
        >
          {t('vault.remove')}
        </Button>
      </div>
    </Page>
  );
}
