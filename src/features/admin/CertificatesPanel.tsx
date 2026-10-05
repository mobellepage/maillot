// Certificate housekeeping: bind the NFC chip sealed onto a shirt to its
// certificate, or revoke a certificate (counterfeit found later, reported
// stolen). Revocation shows publicly on /verify.
import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import { Button, Card, SectionHeader, TextField, useConfirm } from '../../ui/index.ts';

export function CertificatesPanel() {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [uid, setUid] = useState('');
  const [reason, setReason] = useState('');
  const confirm = useConfirm();
  const fail = (e: Error) => toast('Error: ' + e.message);
  const attach = useMutation({ mutationFn: () => db.attachCertificateTag(code.trim(), uid.trim()), onSuccess: () => toast('Tag bound to ' + code.trim()), onError: fail });
  const revoke = useMutation({ mutationFn: () => db.revokeCertificate(code.trim(), reason.trim()), onSuccess: () => toast(code.trim() + ' revoked'), onError: fail });
  return (
    <section aria-labelledby="certs-title" style={{ marginTop: 48 }}>
      <SectionHeader id="certs-title" eyebrow="Certificates" title="Tags & revocation" size="sm" />
      <Card style={{ padding: 18, borderRadius: 16, display: 'grid', gap: 12 }}>
        <TextField srLabel="Certificate code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="MLT-XXXX-XXXX-XXXX" spellCheck={false} />
        {code.trim().length >= 12 && (
          <Link to={'/verify/' + code.trim()} style={{ fontSize: 13 }}>
            Open public page
          </Link>
        )}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <TextField srLabel="NFC tag UID" value={uid} onChange={(e) => setUid(e.target.value)} placeholder="NFC tag UID (hex)" style={{ flex: '1 1 220px' }} />
          <Button size="sm" variant="ghost" disabled={!code.trim() || !uid.trim()} busy={attach.isPending} onClick={() => attach.mutate()}>
            Bind tag
          </Button>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <TextField srLabel="Revocation reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (shown publicly)" style={{ flex: '1 1 220px' }} />
          <Button size="sm" variant="danger" disabled={!code.trim() || !reason.trim()} busy={revoke.isPending} onClick={async () => (await confirm({ title: `Revoke ${code.trim()}?`, body: `Anyone checking this certificate will see it’s no longer valid, with the reason “${reason.trim()}”. This can’t be undone.`, confirmLabel: 'Revoke certificate', tone: 'danger' })) && revoke.mutate()}>
            Revoke
          </Button>
        </div>
      </Card>
    </section>
  );
}
