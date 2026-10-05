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

function CodeForm({ initial = '' }: { initial?: string }) {
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
      <TextField label="Certificate code" placeholder="MLT-XXXX-XXXX-XXXX" value={code} onChange={(e) => setCode(e.target.value.slice(0, 30))} autoCapitalize="characters" spellCheck={false} style={{ flex: '1 1 260px' }} />
      <Button type="submit" style={{ height: 50 }}>
        Check
      </Button>
    </form>
  );
}

export default function VerifyPage() {
  useCatalog();
  const { code = '' } = useParams();
  const [params] = useSearchParams();
  const tag = params.get('tag');
  const { lang } = usePrefs();
  usePageMeta(code ? `Certificate ${code.toUpperCase()}` : 'Verify a certificate', 'Check a Maillot certificate of authenticity by its code.');
  const q = useQuery({ queryKey: ['certificate', code, tag], enabled: !!code, queryFn: () => db.verifyCertificate(code, tag), staleTime: 60_000 });

  if (!code)
    return (
      <Page style={{ maxWidth: 640 }}>
        <div className="eyebrow">Authenticity</div>
        <h1 className="display" style={{ marginTop: 8, fontSize: 'clamp(28px,4vw,42px)' }}>
          Verify a certificate
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.6, margin: '12px 0 0' }}>
          Every shirt that passes our Zürich inspection carries a tamper-evident tag with a certificate code. Scan its QR code or type the code to see what we checked.
        </p>
        <CodeForm />
      </Page>
    );

  const c = q.data;
  const shirt = c?.shirt_id ? BY[c.shirt_id] : undefined;
  const version = ((c?.checks as { checklist?: string } | null)?.checklist ?? 'v1') as ChecklistVersion;
  const checklist = INSPECTION_CHECKLIST[version] ?? INSPECTION_CHECKLIST.v1;
  const url = typeof window !== 'undefined' ? `${window.location.origin}/verify/${c?.code ?? code}` : '';

  return (
    <Page style={{ maxWidth: 820 }}>
      <div className="eyebrow">Certificate of authenticity</div>
      {q.isLoading && <Skeleton height={320} radius={20} style={{ marginTop: 20 }} />}
      {q.isError && (
        <Notice tone="neg" style={{ marginTop: 20 }}>
          We couldn’t check this code right now. Please try again in a moment.
        </Notice>
      )}
      {q.isSuccess && !c && (
        <>
          <h1 className="display" style={{ marginTop: 8, fontSize: 'clamp(26px,3.6vw,38px)' }}>
            No certificate found
          </h1>
          <Notice tone="warn" style={{ marginTop: 16 }}>
            There is no Maillot certificate with the code <span className="mono">{code}</span>. Check for typos — if the code came from a tag on a shirt, that tag may not be
            genuine. <Link to="/help">Contact support</Link> and we’ll look into it.
          </Notice>
          <CodeForm initial={code} />
        </>
      )}
      {c && (
        <>
          <h1 className="display" style={{ marginTop: 8, fontSize: 'clamp(26px,3.6vw,38px)', color: c.revoked ? 'var(--neg)' : undefined }}>
            {c.revoked ? 'Certificate revoked' : '✓ Authenticated by Maillot'}
          </h1>
          {c.revoked && (
            <Notice tone="neg" style={{ marginTop: 14 }}>
              This certificate is no longer valid{c.revoked_reason ? `: ${c.revoked_reason}` : ''}. Don’t buy this shirt on the strength of it.
            </Notice>
          )}
          {c.tag_match === false && (
            <Notice tone="neg" style={{ marginTop: 14 }}>
              The chip you scanned isn’t the one sealed with this certificate. The tag may have been moved to another shirt.
            </Notice>
          )}
          {c.tag_match === true && !c.revoked && (
            <Notice tone="info" style={{ marginTop: 14 }}>
              The chip you scanned is the one we sealed onto this shirt.
            </Notice>
          )}
          <Card style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 24, alignItems: 'center' }}>
            <div style={{ display: 'grid', placeItems: 'center', minHeight: 220 }}>
              {shirt ? <ShirtGraphic pat={shirt.pat} trim={shirt.trim} crest={shirt.crest} title={shirt.name} style={{ width: '70%' }} /> : <div style={{ color: 'var(--muted)' }}>Custom item</div>}
            </div>
            <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px 16px', fontSize: 14 }}>
              <dt style={{ color: 'var(--muted)' }}>Shirt</dt>
              <dd style={{ margin: 0, fontWeight: 600 }}>{shirt ? <Link to={'/shirt/' + shirt.id}>{shirt.name}</Link> : (c.shirt_id ?? '—')}</dd>
              <dt style={{ color: 'var(--muted)' }}>Size</dt>
              <dd style={{ margin: 0 }}>{c.size ?? '—'}</dd>
              <dt style={{ color: 'var(--muted)' }}>Inspected</dt>
              <dd style={{ margin: 0 }}>{formatDate(c.issued_at, lang)} · Zürich</dd>
              <dt style={{ color: 'var(--muted)' }}>Code</dt>
              <dd className="mono" style={{ margin: 0 }}>
                {c.code}
              </dd>
            </dl>
          </Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 24, marginTop: 24, alignItems: 'start' }}>
            <Card>
              <h2 className="title" style={{ margin: 0 }}>
                {checklist.length}-point inspection
              </h2>
              <ul style={{ margin: '12px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 8, fontSize: 13.5, color: 'var(--text-2)' }}>
                {checklist.map((p) => (
                  <li key={p} style={{ display: 'flex', gap: 8 }}>
                    <span aria-hidden="true" style={{ color: 'var(--accent)' }}>
                      ✓
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </Card>
            <Card style={{ display: 'grid', justifyItems: 'center', gap: 12, textAlign: 'center' }}>
              <QrCode value={url} size={168} label={'QR code linking to certificate ' + c.code} />
              <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>Scan to open this page. Selling the shirt on? Share this link with the buyer.</p>
              <Button variant="ghost" size="sm" onClick={() => window.print()}>
                Print certificate
              </Button>
            </Card>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 24 }}>
            <Link to="/authentication">How our authentication works</Link> · <Link to="/verify">Check another code</Link>
          </p>
        </>
      )}
    </Page>
  );
}
