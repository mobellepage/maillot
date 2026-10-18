// Header button to Messages (inquiries), next to the bell; counts the
// received inquiries still waiting for an answer.
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ChatIcon } from '../ui/index.ts';
import { usePrefs } from '../lib/prefs.tsx';
import { useSession } from '../lib/session.tsx';
import * as db from '../utils/db.ts';

export default function MessagesButton() {
  const { t } = usePrefs();
  const { user } = useSession();
  const list = useQuery({ queryKey: ['myInquiries', user?.id], queryFn: db.loadMyInquiries, enabled: !!user, staleTime: 60_000 }).data ?? [];
  const open = list.filter((q) => q.direction === 'received' && q.status === 'open').length;
  return (
    <Link to="/messages" className="icon-btn" aria-label={t('header.messages') + (open ? ` (${open})` : '')} style={{ position: 'relative', flex: 'none', color: 'var(--text)' }}>
      <ChatIcon />
      {open > 0 && (
        <span aria-hidden="true" style={{ position: 'absolute', top: 4, right: 4, minWidth: 15, height: 15, padding: '0 3px', borderRadius: 999, background: 'var(--neg)', color: 'var(--on-neg)', fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center' }}>
          {open > 9 ? '9+' : open}
        </span>
      )}
    </Link>
  );
}
