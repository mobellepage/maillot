// One album: every slot — your Gold card, your digital card, or a
// silhouette — and on every slot that isn't Gold the way to the real shirt:
// offers on Maillot (count and lowest price), collectors who have it, or
// the wishlist when nobody does. Live data from the market.
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import * as db from '../../utils/db.ts';
import type { AlbumSlot } from '../../utils/db.ts';
import { ErrorState, Page, Skeleton } from '../../ui/index.ts';
import { variantLabel } from '../library/model.ts';
import { WishButton } from '../collectors/WishButton.tsx';
import { GameCard } from './GameCard.tsx';
import { albumText } from './model.ts';

export default function AlbumPage() {
  const { slug = '' } = useParams();
  const { t, lang, money } = usePrefs();
  const { user } = useSession();
  const albums = useQuery({ queryKey: ['fantasyAlbums', user?.id], queryFn: db.loadFantasyAlbums, staleTime: 60_000, retry: false });
  const slots = useQuery({ queryKey: ['fantasyAlbum', slug, user?.id], queryFn: () => db.loadFantasyAlbum(slug), staleTime: 30_000, retry: false });
  const album = albums.data?.find((a) => a.slug === slug);
  const title = album ? albumText(album.title, lang) : '';
  usePageMeta((title || t('fantasy.albums.title')) + ' · Fantasy');
  const rows = slots.data ?? [];
  const have = rows.filter((s) => s.state !== 'empty').length;
  const gold = rows.filter((s) => s.state === 'gold').length;
  return (
    <Page>
      <Link to="/fantasy/albums" className="btn btn--ghost btn--sm" style={{ marginBottom: 16 }}>
        ← {t('fantasy.albums.title')}
      </Link>
      <h1 className="display" style={{ fontSize: 'clamp(28px,4vw,40px)', margin: 0 }}>
        {title}
      </h1>
      {album && <p style={{ color: 'var(--text-2)', marginTop: 8, maxWidth: 620, lineHeight: 1.5 }}>{albumText(album.description, lang)}</p>}
      {rows.length > 0 && (
        <div className="fantasy-albumhead">
          <span className="fantasy-progress" aria-hidden="true">
            <span style={{ width: `${(have / rows.length) * 100}%`, background: gold === rows.length ? '#f3c53d' : undefined }} />
          </span>
          <span style={{ fontSize: 13.5, color: 'var(--text-2)' }}>
            {t('fantasy.albums.progress', { have, total: rows.length, gold })}
            {album && (album.done_gold ? ' · ' + t('fantasy.albums.goldDone') : album.done ? ' · ' + t('fantasy.albums.done') : ' · ' + t('fantasy.albums.reward', { n: album.reward_points }))}
          </span>
        </div>
      )}
      {slots.isLoading && <Skeleton height={320} radius={20} style={{ marginTop: 20 }} />}
      {slots.isError && <ErrorState what={title} onRetry={() => slots.refetch()} />}
      {rows.length > 0 && (
        <ul className="fantasy-slots">
          {rows.map((s) => (
            <Slot key={s.kit_id} s={s} money={money} />
          ))}
        </ul>
      )}
      <p style={{ margin: '22px 0 0', fontSize: 12.5, color: 'var(--muted)', maxWidth: 620, lineHeight: 1.5 }}>{t('fantasy.albums.bridgeNote')}</p>
    </Page>
  );
}

function Slot({ s, money }: { s: AlbumSlot; money: (n: number) => string }) {
  const { t } = usePrefs();
  const variant = variantLabel(s.variant, t);
  const name = `${s.club_name} ${s.season} · ${t('lib.kind.' + s.kind)}${variant ? ' · ' + variant : ''}`;
  const toLibrary = '/library/' + s.club_id + '#season-' + s.season;
  return (
    <li className={'fantasy-slot is-' + s.state}>
      {s.state === 'empty' ? (
        <Link to={toLibrary} className="fantasy-slot__empty" aria-label={name}>
          {s.image_path && <img src={s.image_path} alt="" loading="lazy" decoding="async" />}
          <span className="fantasy-slot__q" aria-hidden="true">
            ?
          </span>
        </Link>
      ) : (
        <Link to={toLibrary} aria-label={name} style={{ display: 'block' }}>
          <GameCard c={{ ...s, gold: s.state === 'gold' }} />
        </Link>
      )}
      <div className="fantasy-slot__text">
        <b>
          {s.club_name} {s.season}
        </b>
        <span>
          {t('lib.kind.' + s.kind)}
          {variant && ' · ' + variant}
        </span>
      </div>
      {/* The bridge to the real shirt: not for slots that are Gold already. */}
      {s.state !== 'gold' && (
        <div className="fantasy-slot__bridge">
          {s.offers > 0 ? (
            <Link to={toLibrary} className="btn btn--primary btn--sm">
              {s.min_price !== null ? t('fantasy.albums.offersFrom', { n: s.offers, price: money(Number(s.min_price)) }) : t('fantasy.albums.offers', { n: s.offers })}
            </Link>
          ) : s.owners > 0 ? (
            <Link to={toLibrary} className="btn btn--secondary btn--sm">
              {t('fantasy.albums.owners', { n: s.owners })}
            </Link>
          ) : null}
          <WishButton target={{ catalogId: null, kitId: s.kit_id, kitImage: s.image_path, club: s.club_name, season: s.season }} name={name} labelled />
          <span className="fantasy-slot__gold">{t('fantasy.albums.buyGold')}</span>
        </div>
      )}
    </li>
  );
}
