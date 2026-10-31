// "On my wishlist": a library kit, and which print the member wants on it
// (player and number, both optional) — so the wish says exactly what they're
// looking for, e.g. "AC Milan 2006/07 Home · KAKÁ 22". The same kit can be on
// the wishlist several times, once per print ("add another print").
import { useState } from 'react';
import { usePrefs } from '../../lib/prefs.tsx';
import { useToast } from '../../lib/toast.tsx';
import type { FeedKit } from '../../utils/db.ts';
import { Button, Dialog, TextField } from '../../ui/index.ts';
import { variantLabel } from '../library/model.ts';
import { useKitLikes } from './useKitLikes.ts';


export function WishKitDialog({ kit, onClose, adding = false }: { kit: FeedKit; onClose: () => void; /** Start with an empty print for another entry of this kit. */ adding?: boolean }) {
  const { t } = usePrefs();
  const toast = useToast();
  const likes = useKitLikes();
  const [add, setAdd] = useState(adding);
  // The entry being edited: the one passed in (wishlist card), else the kit's first.
  const current = add ? undefined : kit.entry_id ? kit : likes.get(kit.id);
  const [name, setName] = useState(adding ? '' : (current?.print_name ?? ''));
  const [number, setNumber] = useState(adding ? '' : (current?.print_number ?? ''));
  const variant = variantLabel(kit.variant, t);
  const title = `${kit.club_name} ${kit.season} · ${t('lib.kind.' + kit.kind)}${variant ? ' · ' + variant : ''}`;
  const save = async (withPrint: boolean) => {
    const print = withPrint ? { name: name.trim() || null, number: number || null } : { name: null, number: null };
    const entry = await likes.save(kit, print, current?.entry_id ?? null).catch(() => undefined);
    toast(entry === undefined ? t('vault.saveFailed') : entry === null ? t('wishkit.duplicate') : current ? t('wishkit.updated') : t('wishkit.added'));
    onClose();
  };
  const another = () => {
    setAdd(true);
    setName('');
    setNumber('');
  };
  return (
    <Dialog open onClose={onClose} title={add ? t('wishkit.anotherTitle') : current ? t('wishkit.editTitle') : t('wishkit.title')} width={480}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 18 }}>
        <span className="kit-thumb" style={{ width: 84, height: 84, borderRadius: 16, display: 'grid', placeItems: 'center', flex: 'none', overflow: 'hidden' }}>
          {kit.image_path && <img src={kit.image_path} alt="" style={{ width: '86%', height: '86%', objectFit: 'contain' }} />}
        </span>
        <div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.3, minWidth: 0 }}>{title}</div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save(true);
        }}
      >
        <p style={{ margin: '0 0 10px', fontWeight: 650 }}>{t('wishkit.question')}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 110px', gap: 10 }}>
          <TextField label={t('wishkit.player')} placeholder={t('wishkit.playerPlaceholder')} value={name} autoFocus onChange={(e) => setName(e.target.value.slice(0, 24))} />
          <TextField label={t('wishkit.number')} inputMode="numeric" placeholder="10" value={number} onChange={(e) => setNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))} />
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>{t('wishkit.optional')}</p>
        <div style={{ display: 'grid', gap: 8, marginTop: 18 }}>
          <Button type="submit" block>
            {current ? t('wishkit.save') : t('wishkit.add')}
          </Button>
          {!current && !add && (
            <Button type="button" variant="secondary" block onClick={() => void save(false)}>
              {t('wishkit.noPrint')}
            </Button>
          )}
          {current && (
            <Button type="button" variant="secondary" block onClick={another}>
              + {t('wishkit.another')}
            </Button>
          )}
          {current && (
            <Button
              type="button"
              variant="ghost"
              block
              onClick={() => {
                likes.remove(current);
                toast(t('watch.removed'));
                onClose();
              }}
            >
              {t('wish.remove')}
            </Button>
          )}
        </div>
      </form>
    </Dialog>
  );
}
