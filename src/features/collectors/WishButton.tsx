// A small bookmark on a collector's shirt: puts that kit (or model) on the
// visitor's own wishlist. Not a like — the heart next to it likes the
// collector's shirt.
import { usePrefs } from '../../lib/prefs.tsx';
import { useToast } from '../../lib/toast.tsx';
import { BookmarkIcon } from '../../ui/index.ts';
import { useWish, type WishTarget } from '../watchlist/useWish.ts';

export function WishButton({ target, name, labelled }: { target: WishTarget; name: string; labelled?: boolean }) {
  const { t } = usePrefs();
  const toast = useToast();
  const wish = useWish();
  if (!wish.can(target)) return null;
  const on = wish.has(target);
  const click = () => {
    wish.toggle(target, true);
    toast(on ? t('watch.removed') : t('watch.added'));
  };
  const label = (on ? t('wish.remove') : t('wish.add')) + ' · ' + name;
  return labelled ? (
    <button type="button" className={'btn btn--sm ' + (on ? 'btn--secondary' : 'btn--ghost')} aria-pressed={on} onClick={click}>
      <BookmarkIcon size={15} filled={on} />
      {on ? t('wish.on') : t('wish.add')}
    </button>
  ) : (
    <button type="button" className="icon-btn" aria-pressed={on} aria-label={label} title={on ? t('wish.on') : t('wish.add')} onClick={click} style={{ position: 'relative', zIndex: 2, width: 32, height: 32, borderRadius: 999, color: on ? 'var(--accent)' : 'var(--muted)' }}>
      <BookmarkIcon size={15} filled={on} />
    </button>
  );
}
