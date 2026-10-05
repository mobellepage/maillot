// The signed-in user's own collection (custom items) and their review
// requests. Verification decisions are stamped on the item server-side by
// resolve_review(), so this just reads; valuations are derived from the
// item's current state rather than trusted from a stored copy.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as db from '../../utils/db.ts';
import { estimateValue } from '../../addShirtData.js';
import { BY } from '../../data.ts';
import type { CustomItem, Review, Valuation } from '../../types/domain.ts';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import { useLive } from '../../lib/realtime.ts';

export function currentValuation(c: CustomItem): Valuation | null {
  const catalogItem = c.catalogId ? BY[c.catalogId] : null;
  if (!c.condition) return c.valuation;
  return estimateValue({
    catalogItem,
    version: c.version,
    conditionGrade: c.condition.grade,
    flock: c.flock,
    patches: c.patches,
    signature: c.signature,
    verificationLevel: c.verification.level
  }) as Valuation;
}

/** Owner-facing status, folding in "an expert has picked it up" from the queue. */
export function displayStatus(c: CustomItem, reviews: Review[]): CustomItem['verification']['status'] {
  if (c.verification.status !== 'angefragt') return c.verification.status;
  const r = reviews.find((x) => x.id === c.verification.reviewId);
  return r && r.status === 'in_review' ? 'in Prüfung' : 'angefragt';
}

export function useCollection() {
  const { user } = useSession();
  const uid = user?.id;
  const items = useQuery({ queryKey: ['customItems', uid], enabled: !!uid, queryFn: () => db.loadCustomItems(uid!) });
  const reviews = useQuery({ queryKey: ['myReviews', uid], enabled: !!uid, queryFn: db.loadReviewQueue });
  // An expert's decision stamps the item server-side; show it the moment it lands.
  useLive(
    [
      { table: 'custom_items', filter: 'user_id=eq.' + uid },
      { table: 'review_queue', filter: 'user_id=eq.' + uid }
    ],
    [['customItems', uid], ['myReviews', uid]],
    !!uid
  );
  return { items: items.data ?? [], reviews: reviews.data ?? [], loading: items.isLoading };
}

export function useCollectionActions() {
  const { user } = useSession();
  const uid = user?.id;
  const qc = useQueryClient();
  const toast = useToast();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['customItems', uid] });
    qc.invalidateQueries({ queryKey: ['myReviews', uid] });
  };

  const add = useMutation({
    mutationFn: async (item: Omit<CustomItem, 'id' | 'createdAt' | 'updatedAt' | 'initialValuation'>) => {
      const now = Date.now();
      const full: CustomItem = { ...item, id: 'custom-' + now, createdAt: now, updatedAt: now, initialValuation: item.valuation };
      await db.upsertCustomItem(uid!, full);
      return full;
    },
    onSuccess: refresh,
    onError: () => toast('Saving failed — please try again.')
  });

  const retry = useMutation({
    mutationFn: async (c: CustomItem) => {
      const reviewId = await db.enqueueReview(uid!, c.id, {
        catalogId: c.catalogId,
        proposedName: [c.proposedClub, c.proposedSeason, c.proposedVariant].filter(Boolean).join(' '),
        version: c.version,
        sizeGroup: c.sizeGroup,
        size: c.size,
        sleeve: c.sleeve,
        flock: c.flock,
        patches: c.patches,
        signature: c.signature,
        tagsAttached: c.tagsAttached,
        condition: c.condition,
        provenance: c.provenance,
        photos: c.photos,
        precheck: c.precheck
      });
      await db.upsertCustomItem(uid!, { ...c, verification: { ...c.verification, status: 'angefragt', reason: '', reviewId }, updatedAt: Date.now() });
    },
    onSuccess: () => {
      toast('Submitted for review again');
      refresh();
    },
    onError: () => toast('Submission failed — please try again.')
  });

  const remove = useMutation({
    mutationFn: (c: CustomItem) => db.deleteCustomItem(c),
    onSuccess: () => {
      toast('Removed from your collection');
      refresh();
    },
    onError: (e) => toast((e as { code?: string }).code === '23503' ? 'This shirt has a listing or order — cancel the listing first.' : 'Couldn’t remove it — please try again.')
  });

  return { add, retry, remove };
}
