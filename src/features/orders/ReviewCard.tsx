// After a completed purchase the buyer can rate the seller once; the rating
// shows on the seller's public profile without the buyer's name.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePrefs } from '../../lib/prefs.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import { Button, Card } from '../../ui/index.ts';
import { Stars } from '../../ui/Stars.tsx';

export function ReviewCard({ orderId }: { orderId: string }) {
  const { t } = usePrefs();
  const toast = useToast();
  const qc = useQueryClient();
  const mine = useQuery({ queryKey: ['myReview', orderId], queryFn: () => db.loadMyReview(orderId) });
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const post = useMutation({
    mutationFn: () => db.reviewSeller(orderId, rating, comment),
    onSuccess: () => {
      toast(t('rev.thanks'));
      qc.invalidateQueries({ queryKey: ['myReview', orderId] });
    },
    onError: () => toast(t('rev.failed'))
  });

  if (mine.isLoading) return null;
  if (mine.data)
    return (
      <Card tight style={{ marginTop: 16, fontSize: 14, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {t('rev.yours')}
        <Stars value={mine.data.rating} label={t('seller.stars', { n: mine.data.rating })} />
      </Card>
    );
  return (
    <Card style={{ marginTop: 16 }}>
      <h2 className="title" style={{ margin: 0 }}>
        {t('rev.title')}
      </h2>
      <p style={{ fontSize: 13, color: 'var(--muted)', margin: '6px 0 14px' }}>{t('rev.body')}</p>
      <Stars value={rating} onChange={setRating} label={t('rev.stars')} size={28} />
      <label htmlFor="review-comment" style={{ display: 'block', fontSize: 14, fontWeight: 600, margin: '16px 0 8px' }}>
        {t('rev.comment')}
      </label>
      <textarea
        id="review-comment"
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, 600))}
        rows={3}
        placeholder={t('rev.placeholder')}
        style={{ width: '100%', borderRadius: 12, border: '1px solid var(--line-strong)', background: 'var(--sunken)', color: 'var(--text)', padding: 12, font: 'inherit', fontSize: 14, resize: 'vertical' }}
      />
      <Button size="sm" disabled={!rating} busy={post.isPending} busyLabel={t('rev.sending')} onClick={() => post.mutate()} style={{ marginTop: 12 }}>
        {t('rev.submit')}
      </Button>
    </Card>
  );
}
