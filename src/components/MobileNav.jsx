export default function MobileNav({ v }) {
  if (!v.isMobile) return null;
  return (
    <nav
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 70,
        background: 'rgba(10,12,11,0.94)',
        backdropFilter: 'blur(18px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '8px 6px calc(8px + env(safe-area-inset-bottom))'
      }}
    >
      {v.navItems.map((n, i) => (
        <button
          key={i}
          onClick={n.go}
          style={{
            flex: 1,
            minHeight: 48,
            border: 0,
            background: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            cursor: 'pointer',
            color: n.color,
            fontSize: 11,
            fontWeight: 600
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: n.dot }} />
          {n.short}
        </button>
      ))}
    </nav>
  );
}
