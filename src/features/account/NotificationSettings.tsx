// Which notifications a member wants. Offers, inquiries and orders always
// arrive (money and deadlines); value news, wanted shirts and social can be
// switched off. Stored on the profile and applied by the database.
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import { Card } from '../../ui/index.ts';

const GROUPS = ['value', 'wanted', 'social'] as const;
type Group = (typeof GROUPS)[number];

export function NotificationSettings() {
  const { t } = usePrefs();
  const { user, profile } = useSession();
  const qc = useQueryClient();
  const toast = useToast();
  // The switch flips at once; the saved profile catches up (and wins after a failed save).
  const [chosen, setChosen] = useState<Partial<Record<Group, boolean>> | null>(null);
  const prefs = chosen ?? profile?.notificationPrefs ?? {};
  const save = useMutation({
    mutationFn: (next: Partial<Record<Group, boolean>>) => db.setNotificationPrefs(user!.id, next),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', user?.id] }),
    onError: () => {
      setChosen(null);
      toast(t('vault.saveFailed'));
    }
  });
  if (!user || !profile) return null;
  return (
    <Card>
      <h2 className="title" style={{ fontSize: 17, margin: 0 }}>
        {t('ns.title')}
      </h2>
      <p style={{ fontSize: 13.5, color: 'var(--text-2)', margin: '6px 0 14px' }}>{t('ns.always')}</p>
      <div style={{ display: 'grid', gap: 12 }}>
        {GROUPS.map((g) => (
          <label key={g} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={prefs[g] !== false}
              onChange={(e) => {
                const next = { ...prefs, [g]: e.target.checked };
                setChosen(next);
                save.mutate(next);
              }}
              style={{ width: 18, height: 18, marginTop: 2, accentColor: 'var(--accent)' }}
            />
            <span>
              <span style={{ display: 'block', fontWeight: 600, fontSize: 14.5 }}>{t('ns.' + g)}</span>
              <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)' }}>{t('ns.' + g + 'Hint')}</span>
            </span>
          </label>
        ))}
      </div>
    </Card>
  );
}
