// Admin tools need a second factor (the database checks the session's aal2).
// First visit: set up an authenticator app (QR code + secret), then confirm
// a code. Later visits: just enter the current code.
import { useEffect, useState } from 'react';
import { sb } from '../../utils/supabase.ts';
import { Button, Card, Notice, TextField } from '../../ui/index.ts';

type Enrolment = { factorId: string; qr: string; secret: string };

export function MfaGate() {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let live = true;
    sb()
      .then((c) => c.auth.mfa.listFactors())
      .then(({ data }) => {
        if (!live) return;
        const verified = data?.totp.find((f) => f.status === 'verified');
        if (verified) setFactorId(verified.id);
        setLoaded(true);
      })
      .catch(() => live && setLoaded(true));
    return () => {
      live = false;
    };
  }, []);

  const enrol = async () => {
    setBusy(true);
    setError(null);
    const client = await sb();
    // Drop half-finished enrolments so a fresh QR code can be issued.
    const { data: list } = await client.auth.mfa.listFactors();
    await Promise.all((list?.all ?? []).filter((f) => f.status === 'unverified').map((f) => client.auth.mfa.unenroll({ factorId: f.id })));
    const { data, error: err } = await client.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Maillot admin ' + new Date().toISOString().slice(0, 10) });
    setBusy(false);
    if (err || !data) return setError(err?.message ?? 'Could not start setup.');
    setEnrolment({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const verify = async () => {
    const id = enrolment?.factorId ?? factorId;
    if (!id || code.length !== 6) return;
    setBusy(true);
    setError(null);
    const { error: err } = await (await sb()).auth.mfa.challengeAndVerify({ factorId: id, code });
    setBusy(false);
    // On success the session is upgraded to aal2 and the admin page renders.
    if (err) setError('That code didn’t work — check the time on your phone and try the next one.');
  };

  if (!loaded) return null;
  return (
    <Card style={{ maxWidth: 460 }}>
      <h2 className="title" style={{ margin: 0 }}>
        Two-factor check
      </h2>
      <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.55 }}>
        Admin tools move money and change what buyers see, so they need a code from your authenticator app as well as your password.
      </p>
      {!factorId && !enrolment && (
        <Button busy={busy} onClick={enrol}>
          Set up an authenticator app
        </Button>
      )}
      {enrolment && (
        <div style={{ display: 'grid', gap: 10, justifyItems: 'start' }}>
          <p style={{ fontSize: 13.5, margin: 0 }}>Scan this with 1Password, Google Authenticator or similar:</p>
          <img src={enrolment.qr} alt="QR code for your authenticator app" width={180} height={180} style={{ background: '#fff', borderRadius: 8, padding: 6 }} />
          <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>
            Or enter this key: <span className="mono" style={{ userSelect: 'all' }}>{enrolment.secret}</span>
          </p>
        </div>
      )}
      {(factorId || enrolment) && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            verify();
          }}
          style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginTop: 14, flexWrap: 'wrap' }}
        >
          <TextField label="6-digit code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus style={{ flex: '1 1 180px' }} />
          <Button type="submit" busy={busy} disabled={code.length !== 6} style={{ height: 50 }}>
            Verify
          </Button>
        </form>
      )}
      {error && (
        <Notice tone="neg" style={{ marginTop: 12 }}>
          {error}
        </Notice>
      )}
    </Card>
  );
}
