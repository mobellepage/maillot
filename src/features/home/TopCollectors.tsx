// Community on the home page: the collections people follow most. Shown
// once there are a few, so the row never looks empty.
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { usePrefs } from '../../lib/prefs.tsx';
import * as db from '../../utils/db.ts';
import { ScrollRow, SectionHeader } from '../../ui/index.ts';
import { Avatar } from '../avatars/Avatar.tsx';
import { DealerBadge } from '../collectors/DealerBadge.tsx';
import { useBlocks } from '../moderation/useBlocks.ts';

const MIN_TO_SHOW = 3;

export function TopCollectors() {
  const { t, tp } = usePrefs();
  const blocks = useBlocks();
  const top = blocks.visible(useQuery({ queryKey: ['topCollectors'], queryFn: () => db.loadTopCollectors(10), staleTime: 5 * 60 * 1000 }).data ?? [], (c) => c.handle);
  if (top.length < MIN_TO_SHOW) return null;
  return (
    <section aria-labelledby="top-collectors-title" style={{ maxWidth: 1360, margin: '0 auto', padding: 'clamp(48px,6vw,88px) var(--gutter) 0' }}>
      <SectionHeader id="top-collectors-title" eyebrow={t('home.top.eyebrow')} title={t('home.top.title')} />
      <ScrollRow prevLabel={t('common.scrollPrev')} nextLabel={t('common.scrollNext')}>
        {top.map((c, i) => (
          <li key={c.handle} style={{ flexBasis: 'clamp(170px,16vw,210px)' }}>
            <Link to={'/u/' + c.handle} className="card card--interactive" style={{ display: 'grid', justifyItems: 'center', gap: 8, padding: '22px 14px', borderRadius: 22, color: 'var(--text)', textAlign: 'center', position: 'relative' }}>
              <span className="mono" style={{ position: 'absolute', top: 12, left: 14, fontSize: 12, color: 'var(--muted)' }}>
                #{i + 1}
              </span>
              <Avatar avatar={c.avatar} name={c.handle} size={72} />
              <span style={{ fontWeight: 700, fontSize: 15, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{c.handle}</span>
              {c.dealer && <DealerBadge compact />}
              <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                {tp('coll.shirts', c.shirts)} · {tp('coll.followers', c.followers)}
              </span>
            </Link>
          </li>
        ))}
      </ScrollRow>
    </section>
  );
}
