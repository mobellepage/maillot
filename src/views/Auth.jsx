const MONO = "'JetBrains Mono',monospace";
const ACC = '#4BFF8B';

// Real Supabase email/password auth screen — replaces the old "everyone is
// anonymously 'Luca Meier'" demo account. See engine.js's v.auth / useAuth.js.
export default function Auth({ v }) {
  const a = v.auth;
  return (
    <main style={{ maxWidth: 420, margin: '0 auto', padding: 'clamp(40px,8vw,80px) clamp(16px,4vw,40px) 100px', animation: 'kvIn .4s ease both' }}>
      <div style={{ fontFamily: MONO, fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: ACC }}>{v.t('auth.account')}</div>
      <h1 style={{ margin: '8px 0 0', fontSize: 'clamp(26px,4vw,34px)', fontWeight: 800, fontStretch: '72%', textTransform: 'uppercase', lineHeight: 1 }}>
        {a.isSignIn ? v.t('auth.signin') : v.t('auth.createAccount')}
      </h1>

      {a.notice && (
        <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(111,182,255,0.1)', color: '#6FB6FF', fontSize: 13 }}>{a.notice}</div>
      )}
      {a.error && (
        <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,107,94,0.12)', color: '#FF6B5E', fontSize: 13 }}>{a.error}</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
        <label style={{ fontSize: 12.5, color: '#8C958F' }}>
          {v.t('auth.email')}
          <input
            type="email"
            value={a.email}
            onChange={a.onEmail}
            placeholder="du@example.com"
            style={{ display: 'block', width: '100%', height: 46, marginTop: 6, padding: '0 14px', borderRadius: 12, background: '#121514', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', fontSize: 14, color: '#F2F4F1' }}
          />
        </label>
        <label style={{ fontSize: 12.5, color: '#8C958F' }}>
          {v.t('auth.password')}
          <input
            type="password"
            value={a.password}
            onChange={a.onPassword}
            placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
            style={{ display: 'block', width: '100%', height: 46, marginTop: 6, padding: '0 14px', borderRadius: 12, background: '#121514', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', fontSize: 14, color: '#F2F4F1' }}
          />
        </label>

        <button
          onClick={a.submit}
          disabled={a.busy}
          style={{ height: 48, marginTop: 8, borderRadius: 14, border: 0, background: ACC, color: '#06110A', fontWeight: 700, fontSize: 14.5, cursor: a.busy ? 'default' : 'pointer', opacity: a.busy ? 0.6 : 1 }}
        >
          {a.busy ? v.t('auth.pleaseWait') : a.isSignIn ? v.t('auth.signin') : v.t('auth.createAccount')}
        </button>

        <button onClick={a.switchMode} style={{ marginTop: 4, background: 'none', border: 0, color: '#8C958F', fontSize: 13, cursor: 'pointer', textAlign: 'center' }}>
          {a.isSignIn ? v.t('auth.noAccount') : v.t('auth.haveAccount')}
        </button>
      </div>

      <button onClick={v.goHome} style={{ marginTop: 32, height: 44, padding: '0 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.14)', background: 'none', color: '#F2F4F1', fontWeight: 600, cursor: 'pointer' }}>
        {v.t('auth.back')}
      </button>
    </main>
  );
}
