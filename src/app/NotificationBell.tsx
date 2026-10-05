import { useState } from 'react';
import { useNavigate } from 'react-router';
import { BellIcon } from '../ui/index.ts';
import { usePrefs } from '../lib/prefs.tsx';
import { useNotifications } from '../features/notifications/useNotifications.ts';
import { timeAgo } from '../lib/format.ts';

export default function NotificationBell() {
  const { t, lang } = usePrefs();
  const { items, loading, error, retry, unread, markRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div style={{ position: 'relative', flex: 'none' }}>
      <button type="button" className="icon-btn" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="true" aria-label={t('header.notifications') + (unread ? ` (${unread})` : '')}>
        <BellIcon />
        {unread > 0 && (
          <span aria-hidden="true" style={{ position: 'absolute', top: 4, right: 4, minWidth: 15, height: 15, padding: '0 3px', borderRadius: 999, background: 'var(--neg)', color: 'var(--on-neg)', fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 69 }} />
          <div
            role="menu"
            aria-label={t('header.notifications')}
            onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
            style={{ position: 'absolute', top: 48, right: 0, width: 'min(340px, calc(100vw - 32px))', maxHeight: 420, overflowY: 'auto', background: 'var(--elevated)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 16, boxShadow: '0 16px 40px rgba(0,0,0,0.4)', zIndex: 70, padding: 8 }}
          >
            {error && (
              <div role="alert" style={{ padding: '20px 14px', textAlign: 'center', fontSize: 13, color: 'var(--text-2)' }}>
                Couldn’t load notifications.{' '}
                <button type="button" className="link-btn" onClick={retry}>
                  Try again
                </button>
              </div>
            )}
            {loading && <div style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Loading…</div>}
            {!error && !loading && items.length === 0 && <div style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>{t('header.noNotifications')}</div>}
            {items.map((n) => {
              const data = (n.data || {}) as { order_id?: string; shirt_id?: string };
              return (
                <button
                  key={n.id}
                  role="menuitem"
                  type="button"
                  className="row-btn"
                  onClick={() => {
                    if (!n.read) markRead(n.id);
                    setOpen(false);
                    if (data.order_id) navigate('/orders/' + data.order_id);
                    else if (data.shirt_id) navigate('/shirt/' + data.shirt_id);
                  }}
                  style={{ display: 'block', background: n.read ? 'none' : 'rgba(75,255,139,0.07)', marginBottom: 2 }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {!n.read && <span aria-label="unread" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flex: 'none' }} />}
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{n.title}</span>
                  </span>
                  {n.body && <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{n.body}</span>}
                  <span style={{ display: 'block', fontSize: 10.5, color: 'var(--faint)', marginTop: 4 }}>{timeAgo(n.created_at, lang)}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
