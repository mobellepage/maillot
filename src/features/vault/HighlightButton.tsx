// The star on a collection shirt: one of the member's top five, shown first
// in their collection and on their profile (config HIGHLIGHTS; the database
// refuses a sixth).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CSSProperties } from 'react';
import { HIGHLIGHTS } from '../../config/rules.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import type { CustomItem } from '../../types/domain.ts';
import { StarIcon } from '../../ui/index.ts';
import * as db from '../../utils/db.ts';

export function HighlightButton({ item, items, labelled, style }: { item: CustomItem; items: CustomItem[]; labelled?: boolean; style?: CSSProperties }) {
  const { t } = usePrefs();
  const { user } = useSession();
  const toast = useToast();
  const qc = useQueryClient();
  const key = ['customItems', user?.id];
  const on = !!item.highlightedAt;
  const count = items.filter((c) => c.highlightedAt).length;
  const toggle = useMutation({
    mutationFn: (next: boolean) => db.setHighlight(item.id, next),
    // Moves at once; the database has the last word (at most five).
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: key });
      const before = qc.getQueryData<CustomItem[]>(key);
      qc.setQueryData<CustomItem[]>(key, (xs) => xs?.map((c) => (c.id === item.id ? { ...c, highlightedAt: next ? Date.now() : null } : c)));
      return { before };
    },
    onError: (e, _next, ctx) => {
      qc.setQueryData(key, ctx?.before);
      toast(db.isHighlightLimit(e) ? t('hl.full', { n: HIGHLIGHTS }) : t('toast.actionFailed'));
    },
    onSuccess: (_r, next) => toast(next ? t('hl.added', { n: count + 1, max: HIGHLIGHTS }) : t('hl.removed')),
    onSettled: () => qc.invalidateQueries({ queryKey: key })
  });
  const click = () => {
    if (!on && count >= HIGHLIGHTS) return toast(t('hl.full', { n: HIGHLIGHTS }));
    toggle.mutate(!on);
  };
  const label = on ? t('hl.remove') : t('hl.add');
  return labelled ? (
    <button type="button" className={'btn btn--sm ' + (on ? 'btn--secondary' : 'btn--ghost')} aria-pressed={on} onClick={click} disabled={toggle.isPending} style={style}>
      <StarIcon size={15} filled={on} style={{ color: on ? 'var(--warn)' : undefined }} />
      {on ? t('hl.on') : t('hl.add')}
    </button>
  ) : (
    <button type="button" className="icon-btn" aria-pressed={on} aria-label={label} title={label} onClick={click} disabled={toggle.isPending} style={{ position: 'relative', zIndex: 2, width: 32, height: 32, borderRadius: 8, color: on ? 'var(--warn)' : undefined, ...style }}>
      <StarIcon size={16} filled={on} />
    </button>
  );
}
