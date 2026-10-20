// After the daily puzzle: "Do you have this shirt?" — straight into the
// collection, or onto the wishlist. Ties the daily game to the collection.
import { useState } from 'react';
import { useLocation } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import * as db from '../../utils/db.ts';
import type { DailyKit } from '../../utils/db.ts';
import { BookmarkIcon, Button, ButtonLink } from '../../ui/index.ts';
import { AddKitDialog } from '../vault/AddKitDialog.tsx';
import { useKitLikes } from '../watchlist/useKitLikes.ts';

export function HaveItActions({ answer }: { answer: DailyKit }) {
  const { t } = usePrefs();
  const { user } = useSession();
  const { pathname } = useLocation();
  const likes = useKitLikes();
  const [adding, setAdding] = useState(false);
  // The library kit behind today's puzzle: same club, season and kind, the plain one first.
  const kits = useQuery({ queryKey: ['clubKits', answer.club_id], queryFn: () => db.loadClubKits(answer.club_id), staleTime: 10 * 60_000 });
  const kit = (kits.data ?? []).filter((k) => k.season === answer.season && k.kind === answer.kind).sort((a, b) => (a.variant ? 1 : 0) - (b.variant ? 1 : 0))[0];
  if (!kit) return null;
  const liked = likes.has(kit.id);
  return (
    <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
      <div style={{ fontWeight: 700, fontSize: 15 }}>{t('daily.haveIt')}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
        {user ? (
          <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
            + {t('lib.addToCollection')}
          </Button>
        ) : (
          <ButtonLink size="sm" variant="secondary" to="/signin" state={{ from: pathname, notice: 'lib.signInToAdd' }}>
            + {t('lib.addToCollection')}
          </ButtonLink>
        )}
        <Button
          size="sm"
          variant="ghost"
          aria-pressed={liked}
          onClick={() => likes.toggle({ id: kit.id, club_id: answer.club_id, club_name: answer.club_name, league: answer.league, season: kit.season, season_year: answer.season_year, kind: kit.kind, variant: kit.variant, image_path: kit.image_path })}
        >
          <BookmarkIcon size={14} filled={liked} style={{ color: 'var(--accent)' }} /> {liked ? t('daily.onWishlist') : t('daily.toWishlist')}
        </Button>
      </div>
      {adding && <AddKitDialog kit={kit} clubName={answer.club_name} onClose={() => setAdding(false)} />}
    </div>
  );
}
