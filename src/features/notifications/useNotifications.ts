import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as db from '../../utils/db.ts';
import { useSession } from '../../lib/session.tsx';
import { useLive } from '../../lib/realtime.ts';

export function useNotifications() {
  const { user } = useSession();
  const qc = useQueryClient();
  const key = ['notifications', user?.id];
  const q = useQuery({ queryKey: key, enabled: !!user, queryFn: () => db.loadNotifications(user!.id) });
  useLive([{ table: 'notifications', filter: 'user_id=eq.' + user?.id }], [key], !!user);
  const markRead = useMutation({
    mutationFn: (id: string) => db.markNotificationRead(id),
    onMutate: (id) => qc.setQueryData<db.Notification[]>(key, (xs = []) => xs.map((n) => (n.id === id ? { ...n, read: true } : n)))
  });
  const items = q.data ?? [];
  return { items, unread: items.filter((n) => !n.read).length, markRead: (id: string) => markRead.mutate(id) };
}
