// Under a library kit: the members who have it in their collection. A
// buyer opens the owner's shirt from here to make an offer (when it's open
// to offers or for sale) or to ask about it (when the owner takes
// inquiries) — the deal itself runs as everywhere else in Maillot.
import { useState } from 'react';
import { Link } from 'react-router';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import type { KitOwner } from '../../utils/db.ts';
import { Avatar } from '../avatars/Avatar.tsx';

export function KitOwners({ owners, kitId }: { owners: KitOwner[]; kitId: string }) {
  const { t } = usePrefs();
  const { profile } = useSession();
  const [open, setOpen] = useState(false);
  const open4offers = owners.filter((o) => o.can_ask).length;
  const listId = 'owners-' + kitId;
  return (
    <div style={{ marginTop: 10, borderTop: '1px solid var(--line)', paddingTop: 8 }}>
      <button type="button" className="link-btn" aria-expanded={open} aria-controls={listId} onClick={() => setOpen((o) => !o)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 650, width: '100%', textAlign: 'left' }}>
        <span style={{ display: 'flex' }} aria-hidden="true">
          {owners.slice(0, 3).map((o, i) => (
            <Avatar key={o.item_id} avatar={o.avatar} name={o.handle} size={20} ring={false} style={{ marginLeft: i ? -6 : 0, boxShadow: '0 0 0 2px var(--surface)' }} />
          ))}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          {t('lib.owners', { n: owners.length })}
          {open4offers > 0 && <span style={{ display: 'block', fontWeight: 500, color: 'var(--accent)' }}>{t('lib.ownersOpen', { n: open4offers })}</span>}
        </span>
        <span aria-hidden="true" style={{ color: 'var(--muted)' }}>
          {open ? '▴' : '▾'}
        </span>
      </button>
      {open && (
        <ul id={listId} style={{ listStyle: 'none', padding: 0, margin: '10px 0 0', display: 'grid', gap: 12 }}>
          {owners.map((o) => {
            const mine = !!profile?.handle && profile.handle === o.handle;
            const status = o.visibility === 'forsale' ? t('lib.own.forsale') : o.visibility === 'offers' ? t('lib.own.offers') : o.can_ask ? t('lib.own.ask') : t('lib.own.keeps');
            const action = mine ? t('lib.own.mine') : o.can_ask ? (o.visibility === 'public' ? t('lib.own.askCta') : t('lib.own.offerCta')) : t('lib.own.view');
            return (
              <li key={o.item_id} style={{ fontSize: 12.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                  <Avatar avatar={o.avatar} name={o.handle} size={24} ring={false} />
                  <span style={{ fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{o.handle}</span>
                  {o.size && <span style={{ color: 'var(--muted)', flex: 'none' }}>{o.size}</span>}
                </div>
                <div style={{ color: 'var(--muted)', margin: '2px 0 6px' }}>{status}</div>
                <Link to={'/u/' + o.handle + '/' + encodeURIComponent(o.item_id)} className={'btn btn--sm ' + (o.can_ask && !mine ? 'btn--primary' : 'btn--secondary')} style={{ width: '100%', justifyContent: 'center' }} aria-label={action + ': @' + o.handle}>
                  {action}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
