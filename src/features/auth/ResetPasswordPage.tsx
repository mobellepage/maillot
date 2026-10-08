// /reset-password — where the "choose a new password" email leads. Supabase
// signs the visitor in from the link (recovery session); here they set the
// new password. Without that session the link has expired or was used.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import { Button, Notice, Skeleton, TextField } from '../../ui/index.ts';

export default function ResetPasswordPage() {
  const { t } = usePrefs();
  usePageMeta(t('auth.newPasswordTitle'));
  const { user, loading, updatePassword } = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (password.length < 8) return setError(t('auth.minLength'));
    setBusy(true);
    setError(null);
    const { error: err } = await updatePassword(password);
    setBusy(false);
    if (err) return setError(err);
    toast(t('auth.passwordChanged'));
    navigate('/vault', { replace: true });
  };

  return (
    <main id="main" style={{ maxWidth: 420, margin: '0 auto', padding: 'clamp(40px,8vw,80px) var(--gutter) 100px' }}>
      <div className="eyebrow">{t('auth.account')}</div>
      <h1 className="display" style={{ marginTop: 8, fontSize: 'clamp(26px,4vw,34px)', lineHeight: 1 }}>
        {t('auth.newPasswordTitle')}
      </h1>
      {loading ? (
        <Skeleton height={120} radius={16} style={{ marginTop: 24 }} />
      ) : !user ? (
        <>
          <Notice tone="warn" style={{ marginTop: 20 }}>
            {t('auth.linkInvalid')}
          </Notice>
          <Link to="/signin" className="btn btn--secondary btn--block" style={{ marginTop: 20 }}>
            {t('auth.toSignIn')}
          </Link>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 24 }}
        >
          {error && <Notice tone="neg">{error}</Notice>}
          <TextField
            label={t('auth.newPassword')}
            type="password"
            name="new-password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            hint={t('auth.minLength')}
          />
          <Button type="submit" block busy={busy} busyLabel={t('auth.pleaseWait')}>
            {t('auth.savePassword')}
          </Button>
        </form>
      )}
    </main>
  );
}
