export default function Header({ v }) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 60,
        background: 'rgba(10,12,11,0.82)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)'
      }}
    >
      <div
        style={{
          maxWidth: 1360,
          margin: '0 auto',
          padding: '0 clamp(16px,4vw,40px)',
          height: 68,
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(12px,2vw,28px)'
        }}
      >
        <button
          onClick={v.goHome}
          style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 0, padding: 0, cursor: 'pointer', flex: 'none' }}
        >
          <div style={{ width: 28, height: 28, borderRadius: 8, background: '#4BFF8B', display: 'grid', placeItems: 'center' }}>
            <div style={{ width: 10, height: 10, border: '2.5px solid #0A0C0B', borderRadius: 2, transform: 'rotate(45deg)' }} />
          </div>
          <span style={{ fontWeight: 800, fontStretch: '78%', fontSize: 22, letterSpacing: '0.03em', color: '#F2F4F1' }}>MAILLOT</span>
        </button>

        {v.notMobile && (
          <nav style={{ display: 'flex', gap: 2 }}>
            {v.navItems.map((n, i) => (
              <button
                key={i}
                onClick={n.go}
                className="hov-link"
                style={{
                  border: 0,
                  padding: '8px 14px',
                  borderRadius: 999,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  color: n.color,
                  background: n.bg,
                  transition: 'color .2s,background .2s'
                }}
              >
                {n.label}
              </button>
            ))}
          </nav>
        )}

        <div style={{ flex: 1 }} />

        {v.showNavSearch && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              height: 40,
              flex: '0 1 auto',
              padding: '0 14px',
              borderRadius: 999,
              background: '#141816',
              border: '1px solid rgba(255,255,255,0.07)',
              width: 'min(280px,26vw)',
              color: '#8C958F'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="7"></circle>
              <path d="M20 20l-3.5-3.5"></path>
            </svg>
            <input
              value={v.q}
              onChange={v.onNavSearch}
              placeholder="Search shirts, clubs, players"
              style={{ flex: 1, minWidth: 0, background: 'none', border: 0, outline: 'none', fontSize: 13.5, color: '#F2F4F1' }}
            />
          </div>
        )}

        <button
          onClick={v.goWatch}
          className="hov-border-acc"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            height: 40,
            padding: '0 12px',
            borderRadius: 999,
            background: 'none',
            border: '1px solid rgba(255,255,255,0.09)',
            cursor: 'pointer',
            color: '#F2F4F1',
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: 13,
            transition: 'border-color .2s',
            flex: 'none'
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="#4BFF8B" stroke="#4BFF8B" strokeWidth="2">
            <path d="M12 20.5s-7.5-4.6-9.4-9.3C1.2 7.8 3.4 4.5 6.9 4.5c2 0 3.6 1.1 5.1 3 1.5-1.9 3.1-3 5.1-3 3.5 0 5.7 3.3 4.3 6.7-1.9 4.7-9.4 9.3-9.4 9.3z"></path>
          </svg>
          {v.watchCount}
        </button>

        {v.isLoggedIn ? (
          <>
            <button
              onClick={v.goProfile}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: '2px solid #4BFF8B',
                background: 'linear-gradient(135deg,#2B3A31,#151A17)',
                color: '#F2F4F1',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                flex: 'none'
              }}
              title={v.userEmail}
            >
              {v.userInitials}
            </button>
            {v.notMobile && (
              <button onClick={v.doSignOut} style={{ background: 'none', border: 0, color: '#8C958F', fontSize: 12.5, cursor: 'pointer', flex: 'none' }}>
                Abmelden
              </button>
            )}
          </>
        ) : (
          <button
            onClick={v.goAuth}
            style={{ height: 40, padding: '0 16px', borderRadius: 999, border: 0, background: '#4BFF8B', color: '#06110A', fontWeight: 700, fontSize: 13, cursor: 'pointer', flex: 'none' }}
          >
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}
