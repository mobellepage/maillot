// Inquiries about collector's pieces, on the Messages page: received ones
// (answer, ignore, or open the shirt to offers) and the ones you sent
// (with the owner's reply).
import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import type { Inquiry } from '../../utils/db.ts';
import { Badge, Button, Card, EmptyState } from '../../ui/index.ts';
import { Avatar } from '../avatars/Avatar.tsx';

function InquiryRow({ q }: { q: Inquiry }) {
  const { t, money } = usePrefs();
  const { user } = useSession();
  const toast = useToast();
  const qc = useQueryClient();
  const [reply, setReply] = useState('');
  const done = () => qc.invalidateQueries({ queryKey: ['myInquiries'] });
  const answer = useMutation({ mutationFn: () => db.answerInquiry(q.id, reply), onSuccess: () => {
      toast(t('inq.replied'));
      done();
    }, onError: () => toast(t('toast.actionFailed')) });
  const dismiss = useMutation({ mutationFn: () => db.dismissInquiry(q.id), onSuccess: done, onError: () => toast(t('toast.actionFailed')) });
  const openToOffers = useMutation({
    mutationFn: () => db.setItemVisibility(q.item_id, 'offers'),
    onSuccess: () => {
      toast(t('inq.opened'));
      qc.invalidateQueries({ queryKey: ['customItems', user?.id] });
    },
    onError: () => toast(t('toast.actionFailed'))
  });
  const received = q.direction === 'received';
  const who = q.other_handle ? '@' + q.other_handle : t('seller.newSeller');
  return (
    <Card tight>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Avatar avatar={q.other_avatar} name={q.other_handle || '?'} size={36} ring={false} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>
            <Link to={received ? '/vault/item/' + q.item_id : '/u/' + q.other_handle + '/' + encodeURIComponent(q.item_id)} style={{ color: 'var(--text)' }}>
              {q.item_name || t('coll.untitled')}
            </Link>
            {q.amount != null && <span className="mono" style={{ fontWeight: 600 }}> · {t('inq.around', { price: money(Number(q.amount)) })}</span>}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>{received ? t('inq.from', { handle: who }) : t('inq.to', { handle: who })}</div>
          {q.message && <p style={{ margin: '8px 0 0', fontSize: 14 }}>“{q.message}”</p>}
          {q.reply && (
            <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text-2)' }}>
              <strong>{received ? t('inq.yourReply') : t('inq.theirReply')}:</strong> {q.reply}
            </p>
          )}
        </div>
        <Badge tone={q.status === 'open' ? 'accent' : 'neutral'}>{t('inq.status.' + q.status)}</Badge>
      </div>
      {received && q.status === 'open' && (
        <div style={{ marginTop: 12 }}>
          <textarea
            aria-label={t('inq.replyLabel')}
            value={reply}
            onChange={(e) => setReply(e.target.value.slice(0, 500))}
            placeholder={t('inq.replyPlaceholder')}
            rows={2}
            style={{ width: '100%', padding: 10, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--sunken)', color: 'var(--text)', font: 'inherit', fontSize: 14, resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <Button size="sm" disabled={!reply.trim()} busy={answer.isPending} onClick={() => answer.mutate()}>
              {t('inq.reply')}
            </Button>
            <Button size="sm" variant="secondary" busy={openToOffers.isPending} onClick={() => openToOffers.mutate()}>
              {t('inq.openToOffers')}
            </Button>
            <Button size="sm" variant="ghost" busy={dismiss.isPending} onClick={() => dismiss.mutate()}>
              {t('inq.ignore')}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export function InquiriesPanel({ page = false }: { page?: boolean }) {
  const { t } = usePrefs();
  const { user } = useSession();
  const query = useQuery({ queryKey: ['myInquiries', user?.id], queryFn: db.loadMyInquiries, enabled: !!user });
  const list = query.data ?? [];
  if (!list.length) return page && !query.isLoading ? <EmptyState title={t('msg.empty')}>{t('msg.emptyBody')}</EmptyState> : null;
  const received = list.filter((q) => q.direction === 'received');
  const sent = list.filter((q) => q.direction === 'sent');
  return (
    <section aria-labelledby="inquiries-title" style={{ marginTop: 24 }}>
      <h2 id="inquiries-title" className="title" style={{ fontSize: 17 }}>
        {t('inq.panelTitle')}
      </h2>
      {received.length > 0 && (
        <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
          {received.map((q) => (
            <InquiryRow key={q.id} q={q} />
          ))}
        </div>
      )}
      {sent.length > 0 && (
        <>
          <div style={{ fontSize: 13, color: 'var(--muted)', margin: '14px 0 6px' }}>{t('inq.sentTitle')}</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {sent.map((q) => (
              <InquiryRow key={q.id} q={q} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
