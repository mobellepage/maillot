// The library's "Add to my collection": a pop-up with the kit, size, version
// and print — saved straight into the collection (photos can follow), or on
// to the full add flow with your own photos.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { FLOCK_SOURCES, SIZE_GROUPS, VERSIONS } from '../../addShirtData.js';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import type { Kit } from '../../utils/db.ts';
import * as db from '../../utils/db.ts';
import { Button, Dialog, TextField } from '../../ui/index.ts';
import { variantLabel } from '../library/model.ts';
import { Pill, Pills, Section } from './addshirt/parts.tsx';
import { quickItem } from './quickAdd.ts';
import { useCollectionActions } from './useCollection.ts';
import { PREMIUM_ENABLED } from '../../config/plans.ts';

export function AddKitDialog({ kit, clubName, onClose }: { kit: Kit; clubName: string; onClose: () => void }) {
  const { t, label } = usePrefs();
  const { profile } = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const { add } = useCollectionActions();
  const [size, setSize] = useState('');
  const [version, setVersion] = useState('');
  const [flock, setFlock] = useState({ source: 'Keine', name: '', number: '' });
  const v = variantLabel(kit.variant, t);
  const name = `${clubName} ${kit.season} · ${t('lib.kind.' + kit.kind)}${v ? ' · ' + v : ''}`;

  const save = () =>
    add.mutate(quickItem(kit, clubName, size, version, flock, profile?.collectionPrivate), {
      onSuccess: (item) => {
        toast(t('qa.saved'));
        onClose();
        navigate('/vault/item/' + item.id);
      },
      onError: (e) => {
        if (db.isPlanLimitError(e) && PREMIUM_ENABLED) navigate('/premium');
      }
    });

  return (
    <Dialog open onClose={onClose} title={t('addkit.title')} width={540}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
        <span className="kit-thumb" style={{ width: 92, height: 92, borderRadius: 16, display: 'grid', placeItems: 'center', flex: 'none', overflow: 'hidden' }}>
          {kit.image_path && <img src={kit.image_path} alt="" style={{ width: '86%', height: '86%', objectFit: 'contain' }} />}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.3 }}>{name}</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>📷 {t('addkit.photosLater')}</div>
        </div>
      </div>
      <Section title={t('qa.size')} hint={t('qa.optional')}>
        <Pills>
          {SIZE_GROUPS.Herren.map((s: string) => (
            <Pill key={s} active={size === s} onClick={() => setSize(size === s ? '' : s)}>
              {s}
            </Pill>
          ))}
        </Pills>
      </Section>
      <Section title={t('qa.version')} hint={t('qa.optional')}>
        <Pills>
          {VERSIONS.filter((x: string) => x !== 'Unbekannt').map((x: string) => (
            <Pill key={x} active={version === x} onClick={() => setVersion(version === x ? '' : x)}>
              {label('opt', x)}
            </Pill>
          ))}
        </Pills>
      </Section>
      <Section title={t('qa.flock')} hint={t('qa.optional')}>
        <Pills>
          {FLOCK_SOURCES.map((src: string) => (
            <Pill key={src} active={flock.source === src} onClick={() => setFlock({ ...flock, source: src })}>
              {label('opt', src)}
            </Pill>
          ))}
        </Pills>
        {flock.source !== 'Keine' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 110px', gap: 10 }}>
            <TextField label={t('qa.flockName')} value={flock.name} onChange={(e) => setFlock({ ...flock, name: e.target.value.slice(0, 30) })} />
            <TextField label={t('qa.flockNumber')} inputMode="numeric" value={flock.number} onChange={(e) => setFlock({ ...flock, number: e.target.value.replace(/[^0-9]/g, '').slice(0, 3) })} />
          </div>
        )}
      </Section>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button onClick={save} busy={add.isPending} disabled={add.isPending}>
          {t('addkit.save')}
        </Button>
        <Link to="/vault/add" onClick={onClose} style={{ fontSize: 13.5, fontWeight: 600 }}>
          {t('addkit.withPhotos')} ›
        </Link>
      </div>
    </Dialog>
  );
}
