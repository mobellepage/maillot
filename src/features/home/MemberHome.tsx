// The top of Discover for signed-in members: a greeting with their level and
// the search. Discover is for discovering — what their own collection is
// worth and their favourite team's checklist live on My collection.
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { LevelBadge } from '../levels/LevelBadge.tsx';
import { valueOf } from '../vault/model.ts';
import { useCollection } from '../vault/useCollection.ts';
import { HomeSearch } from './HomeSearch.tsx';

export function MemberHome() {
  const { t } = usePrefs();
  const { profile } = useSession();
  const { items } = useCollection();
  const value = items.reduce((a, c) => a + (valueOf(c) ?? 0), 0);
  return (
    <section aria-labelledby="me-title" style={{ maxWidth: 1360, margin: '0 auto', padding: 'clamp(24px,4vw,44px) var(--gutter) 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <h1 id="me-title" className="display" style={{ fontSize: 'clamp(26px,3.6vw,38px)', margin: 0 }}>
          {profile?.handle ? t('home.me.hello', { name: '@' + profile.handle }) : t('home.me.helloAnon')}
        </h1>
        <LevelBadge shirts={items.length} value={value} />
      </div>
      <HomeSearch />
    </section>
  );
}
