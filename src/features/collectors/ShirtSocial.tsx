// Under a shirt in someone's collection: a heart with its count and the
// comments. Members like and comment (the owner hears about it); the owner
// can remove any comment, authors their own. Visitors read along.
import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { timeAgo } from '../../lib/format.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import type { ItemSocial } from '../../utils/db.ts';
import { Button, ButtonLink } from '../../ui/index.ts';
import { Avatar } from '../avatars/Avatar.tsx';

const MAX = 500;

export function ShirtSocial({ itemId }: { itemId: string }) {
  const { t, tp, lang } = usePrefs();
  const { user } = useSession();
  const { pathname } = useLocation();
  const toast = useToast();
  const qc = useQueryClient();
  const key = ['itemSocial', itemId, user?.id];
  const social = useQuery({ queryKey: key, queryFn: () => db.loadItemSocial(itemId), retry: false });
  const [text, setText] = useState('');
  const failed = (e: unknown) => toast((e as { code?: string }).code === 'P0429' ? t('social.limited') : t('social.failed'));

  const like = useMutation({
    mutationFn: (on: boolean) => db.setItemLike(itemId, on),
    onMutate: (on) => {
      const prev = qc.getQueryData<ItemSocial | null>(key);
      if (prev) qc.setQueryData<ItemSocial>(key, { ...prev, liked: on, likes: prev.likes + (on ? 1 : -1) });
      return prev;
    },
    onError: (e, _on, prev) => {
      qc.setQueryData(key, prev);
      failed(e);
    },
    onSuccess: (likes, on) => {
      const cur = qc.getQueryData<ItemSocial | null>(key);
      if (cur) qc.setQueryData<ItemSocial>(key, { ...cur, liked: on, likes });
    }
  });
  const send = useMutation({
    mutationFn: () => db.addItemComment(itemId, text),
    onSuccess: () => {
      setText('');
      qc.invalidateQueries({ queryKey: ['itemSocial', itemId] });
    },
    onError: failed
  });
  const remove = useMutation({
    mutationFn: (id: string) => db.deleteItemComment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['itemSocial', itemId] }),
    onError: failed
  });

  const s = social.data;
  if (!s) return null;
  const signIn = { from: pathname, notice: 'social.signIn' };

  return (
    <section aria-labelledby="social-title" style={{ marginTop: 28, maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {user && !s.isOwner ? (
          <button type="button" className="option-btn" aria-pressed={s.liked} onClick={() => like.mutate(!s.liked)} disabled={like.isPending} style={{ padding: '8px 14px', fontSize: 14, fontWeight: 650, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span aria-hidden="true" style={{ color: s.liked ? '#E0245E' : 'var(--muted)', fontSize: 17 }}>
              {s.liked ? '♥' : '♡'}
            </span>
            {s.liked ? t('social.liked') : t('social.like')}
          </button>
        ) : !user ? (
          <ButtonLink to="/signin" state={signIn} size="sm" variant="secondary">
            ♡ {t('social.like')}
          </ButtonLink>
        ) : null}
        <span style={{ fontSize: 14, color: 'var(--text-2)' }}>{tp('social.likes', s.likes)}</span>
      </div>

      <h2 id="social-title" className="title" style={{ margin: '24px 0 10px', fontSize: 18 }}>
        {t('social.comments')} <span style={{ color: 'var(--muted)', fontWeight: 500 }}>{s.comments.length}</span>
      </h2>
      {s.comments.length === 0 && <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--muted)' }}>{t('social.none')}</p>}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
        {s.comments.map((c) => (
          <li key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Avatar avatar={c.avatar} name={c.handle ?? '?'} size={34} ring={false} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap', fontSize: 13 }}>
                {c.handle ? (
                  <Link to={'/u/' + c.handle} style={{ fontWeight: 700, color: 'var(--text)' }}>
                    @{c.handle}
                  </Link>
                ) : (
                  <strong>{t('social.collector')}</strong>
                )}
                <span style={{ color: 'var(--faint)', fontSize: 12 }}>{timeAgo(c.created_at, lang)}</span>
                {c.can_delete && (
                  <button type="button" className="nav-link" onClick={() => remove.mutate(c.id)} disabled={remove.isPending} style={{ fontSize: 12, padding: 0, background: 'none', border: 0, cursor: 'pointer', color: 'var(--muted)' }}>
                    {t('social.delete')}
                  </button>
                )}
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 14.5, lineHeight: 1.45, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{c.body}</p>
            </div>
          </li>
        ))}
      </ul>

      {user ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) send.mutate();
          }}
          style={{ display: 'grid', gap: 8, marginTop: 16 }}
        >
          <label htmlFor="social-text" className="sr-only">
            {t('social.write')}
          </label>
          <div className="field">
            <textarea id="social-text" rows={2} maxLength={MAX} value={text} onChange={(e) => setText(e.target.value)} placeholder={t('social.write')} style={{ resize: 'vertical', minHeight: 64 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--faint)' }}>
              {text.length}/{MAX}
            </span>
            <Button type="submit" size="sm" busy={send.isPending} disabled={!text.trim() || send.isPending}>
              {t('social.send')}
            </Button>
          </div>
        </form>
      ) : (
        <p style={{ marginTop: 14, fontSize: 14 }}>
          <Link to="/signin" state={signIn}>
            {t('social.signInToComment')}
          </Link>
        </p>
      )}
    </section>
  );
}
