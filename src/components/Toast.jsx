export default function Toast({ v }) {
  if (!v.hasToast) return null;
  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        bottom: v.toastBottom,
        transform: 'translateX(-50%)',
        zIndex: 120,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 18px',
        borderRadius: 999,
        background: '#F2F4F1',
        color: '#0A0C0B',
        fontSize: 14,
        fontWeight: 600,
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        animation: 'kvIn .3s ease both',
        whiteSpace: 'nowrap'
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1DB45A' }} />
      {v.toast}
    </div>
  );
}
