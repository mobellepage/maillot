// Account → the members you blocked, each with a way to lift the block.
import { Link } from 'react-router';
import { usePrefs } from '../../lib/prefs.tsx';
import { Avatar } from '../avatars/Avatar.tsx';
import { Button, Card } from '../../ui/index.ts';
import { useBlocks } from './useBlocks.ts';

export function BlockedMembers() {
  const { t } = usePrefs();
  const blocks = useBlocks();
  return (
    <Card>
      <h2 style={{ fontSize: 17, marginBottom: 6 }}>{t('mod.blockedTitle')}</h2>
      {!blocks.list.length ? (
        <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>{t('mod.blockedNone')}</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'grid', gap: 10 }}>
          {blocks.list.map((b) => (
            <li key={b.handle} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar avatar={b.avatar} name={b.handle} size={32} ring={false} />
              <Link to={'/u/' + b.handle} style={{ flex: 1, minWidth: 0, fontWeight: 600, color: 'var(--text)', overflowWrap: 'anywhere' }}>
                @{b.handle}
              </Link>
              <Button size="sm" variant="secondary" disabled={blocks.unblock.isPending} onClick={() => blocks.unblock.mutate(b.handle)}>
                {t('mod.unblockShort')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
