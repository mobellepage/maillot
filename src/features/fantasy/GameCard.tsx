// One card of the game: a library kit as a digital card (framed by its
// rarity) or one of the member's own shirts as a Gold card (their photo,
// the holo sheen). The same HoloCard as the collector card.
import { usePrefs } from '../../lib/prefs.tsx';
import { usePhotoUrls } from '../../lib/usePhotoUrls.ts';
import { HoloCard } from '../vault/card/HoloCard.tsx';
import { isCutoutPath } from '../vault/addshirt/studio.ts';
import { variantLabel } from '../library/model.ts';
import { isRarity } from './model.ts';

export interface GameCardModel {
  kit_id: string;
  club_name: string;
  season: string;
  kind: string;
  variant: string;
  image_path: string | null;
  rarity: string;
  gold?: boolean;
  verified?: boolean;
  photo_path?: string | null;
  thumb_path?: string | null;
  copies?: number;
}

export function GameCard({ c, small = true }: { c: GameCardModel; small?: boolean }) {
  const { t } = usePrefs();
  const own = usePhotoUrls([c.gold && c.photo_path ? { path: c.photo_path, thumbPath: c.thumb_path ?? undefined } : undefined], small);
  const photo = c.gold && c.photo_path ? own({ path: c.photo_path, thumbPath: c.thumb_path ?? undefined }) : undefined;
  const variant = variantLabel(c.variant, t);
  const tone = c.gold ? 'gold' : isRarity(c.rarity) ? c.rarity : 'common';
  return (
    <HoloCard
      small={small}
      card={{
        image: photo ?? c.image_path ?? undefined,
        cutout: photo ? isCutoutPath(c.photo_path) : true,
        title: `${c.club_name} ${c.season}`,
        subtitle: t('lib.kind.' + c.kind) + (variant ? ' · ' + variant : ''),
        chips: c.copies && c.copies > 1 ? [t('fantasy.cards.copies', { n: c.copies })] : [],
        handle: null,
        badge: c.gold ? (c.verified ? t('fantasy.gold.verified') : t('fantasy.gold.badge')) : t('fantasy.rarity.' + tone),
        tone
      }}
    />
  );
}
