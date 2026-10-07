// Public certificate check: /verify (enter a code) and /verify/:code (from
// the QR code or NFC chip on the tag; a chip can append ?tag=<UID>). Shows
// only what the certificate proves — shirt, size, date, checklist — never
// who bought or sold it.
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { BY } from '../../data.ts';
import { formatDate } from '../../lib/format.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import * as db from '../../utils/db.ts';
import { INSPECTION_CHECKLIST, type ChecklistVersion } from '../../config/inspection.ts';
import { useCatalog } from '../catalog/useCatalog.ts';
import { Button, Card, Notice, Page, ShirtGraphic, Skeleton, TextField } from '../../ui/index.ts';
import { QrCode } from '../../ui/QrCode.tsx';
import { shareOrigin } from '../../config/site.ts';

function CodeForm({ initial = '' }: { initial?: string }) {
  const { t } = usePrefs();
  const [code, setCode] = useState(initial);
  const nav = useNavigate();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (code.trim()) nav('/verify/' + encodeURIComponent(code.trim().toUpperCase()));
      }}
      style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 24 }}
    >
      <TextField label={t('ver.code')} placeholder="MLT-XXXX-XXXX-XXXX" value={code} onChange={(e) => setCode(e.target.value.slice(0, 30))} autoCapitalize="characters" spellCheck={false} style={{ flex: '1 1 260px' }} />
      <Button type="submit" style={{ height: 50 }}>
        {t('ver.check')}
      </Button>
    </form>
  );
}

export default function VerifyPage() {
  useCatalog();
  const { code = '' } = useParams();
  const [params] = useSearchParams();
  const tag = params.get('tag');
  const { lang, t } = usePrefs();
  usePageMeta(code ? t('ver.meta', { code: code.toUpperCase() }) : t('ver.metaTitle'), t('ver.metaDesc'));
  const q = useQuery({ queryKey: ['certificate', code, tag], enabled: !!code, queryFn: () => db.verifyCertificate(code, tag), staleTime: 60_000 });

  if (!code)
    return (
      <Page style={{ maxWidth: 640 }}>
        <div className="eyebrow">{t('ver.eyebrow')}</div>
        <h1 className="display" style={{ marginTop: 8, fontSize: 'clamp(28px,4vw,42px)' }}>
          {t('ver.title')}
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.6, margin: '12px 0 0' }}>
          {t('ver.intro')}
        </p>
        <CodeForm />
      </Page>
    );

  const c = q.data;
  const shirt = c?.shirt_id ? BY[c.shirt_id] : undefined;
  const version = ((c?.checks as { checklist?: string } | null)?.checklist ?? 'v1') as ChecklistVersion;
  const checklist = INSPECTION_CHECKLIST[version] ?? INSPECTION_CHECKLIST.v1;
  const url = `${shareOrigin()}/verify/${c?.code ?? code}`;

  return (
    <Page style={{ maxWidth: 820 }}>
      <div className="eyebrow">{t('ver.cert')}</div>
      {q.isLoading && <Skeleton height={320} radius={20} style={{ marginTop: 20 }} />}
      {q.isError && (
        <Notice tone="neg" style={{ marginTop: 20 }}>
          {t('ver.error')}
        </Notice>
      )}
      {q.isSuccess && !c && (
        <>
          <h1 className="display" style={{ marginTop: 8, fontSize: 'clamp(26px,3.6vw,38px)' }}>
            {t('ver.none')}
          </h1>
          <Notice tone="warn" style={{ marginTop: 16 }}>
            {t('ver.noneBody', { code })} <Link to="/help">{t('ver.support')}</Link>
          </Notice>
          <CodeForm initial={code} />
        </>
      )}
      {c && (
        <>
          <h1 className="display" style={{ marginTop: 8, fontSize: 'clamp(26px,3.6vw,38px)', color: c.revoked ? 'var(--neg)' : undefined }}>
            {c.revoked ? t('ver.revokedTitle') : t('ver.ok')}
          </h1>
          {c.revoked && (
            <Notice tone="neg" style={{ marginTop: 14 }}>
              {t('ver.revokedBody')} {c.revoked_reason && t('ver.revokedReason', { reason: c.revoked_reason })}
            </Notice>
          )}
          {c.tag_match === false && (
            <Notice tone="neg" style={{ marginTop: 14 }}>
              {t('ver.tagMismatch')}
            </Notice>
          )}
          {c.tag_match === true && !c.revoked && (
            <Notice tone="info" style={{ marginTop: 14 }}>
              {t('ver.tagMatch')}
            </Notice>
          )}
          <Card style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 24, alignItems: 'center' }}>
            <div style={{ display: 'grid', placeItems: 'center', minHeight: 220 }}>
              {shirt ? <ShirtGraphic pat={shirt.pat} trim={shirt.trim} crest={shirt.crest} title={shirt.name} style={{ width: '70%' }} /> : <div style={{ color: 'var(--muted)' }}>{t('ver.custom')}</div>}
            </div>
            <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px 16px', fontSize: 14 }}>
              <dt style={{ color: 'var(--muted)' }}>{t('ver.shirt')}</dt>
              <dd style={{ margin: 0, fontWeight: 600 }}>{shirt ? <Link to={'/shirt/' + shirt.id}>{shirt.name}</Link> : (c.shirt_id ?? '—')}</dd>
              <dt style={{ color: 'var(--muted)' }}>{t('ver.size')}</dt>
              <dd style={{ margin: 0 }}>{c.size ?? '—'}</dd>
              <dt style={{ color: 'var(--muted)' }}>{t('ver.inspected')}</dt>
              <dd style={{ margin: 0 }}>{t('ver.zurich', { date: formatDate(c.issued_at, lang) })}</dd>
              <dt style={{ color: 'var(--muted)' }}>{t('ver.codeLabel')}</dt>
              <dd className="mono" style={{ margin: 0 }}>
                {c.code}
              </dd>
            </dl>
          </Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 24, marginTop: 24, alignItems: 'start' }}>
            <Card>
              <h2 className="title" style={{ margin: 0 }}>
                {t('ver.points', { n: checklist.length })}
              </h2>
              <ul style={{ margin: '12px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 8, fontSize: 13.5, color: 'var(--text-2)' }}>
                {checklist.map((p) => (
                  <li key={p} style={{ display: 'flex', gap: 8 }}>
                    <span aria-hidden="true" style={{ color: 'var(--accent)' }}>
                      ✓
                    </span>
                    {t(p)}
                  </li>
                ))}
              </ul>
            </Card>
            <Card style={{ display: 'grid', justifyItems: 'center', gap: 12, textAlign: 'center' }}>
              <QrCode value={url} size={168} label={t('ver.qr', { code: c.code })} />
              <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>{t('ver.scan')}</p>
              <Button variant="ghost" size="sm" onClick={() => window.print()}>
                {t('ver.print')}
              </Button>
            </Card>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 24 }}>
            <Link to="/authentication">{t('ver.how')}</Link> · <Link to="/verify">{t('ver.another')}</Link>
          </p>
        </>
      )}
    </Page>
  );
}
