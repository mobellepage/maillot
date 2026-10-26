// Edit a shirt already in the collection: its details (version, size, print,
// patches, signature, tags, condition, story) and its photos — add, replace
// or remove them — without removing and re-adding the shirt. Photos save the
// moment they're taken; the details on "Save". An expert-verified shirt keeps
// its verified details: only photos can change.
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import type { CustomItem } from '../../types/domain.ts';
import * as db from '../../utils/db.ts';
import { analyzeAndCompress } from '../../utils/image.ts';
import { Button, Dialog, Notice } from '../../ui/index.ts';
import { DetailsStep, type DetailsFields } from './addshirt/DetailsStep.tsx';
import { PhotoSlot } from './addshirt/parts.tsx';

const stamp = () => Date.now();

/** The photos a shirt can have, in the order the add-shirt flow asks for them. */
const PHOTO_KEYS = ['front', 'back', 'crest', 'sponsor', 'collar', 'product_code', 'seams'];

function fieldsOf(c: CustomItem): DetailsFields {
  return {
    catalogId: c.catalogId,
    version: c.version ?? '',
    sizeGroup: c.sizeGroup ?? '',
    size: c.size ?? '',
    sleeve: c.sleeve ?? '',
    flock: { source: c.flock?.source || 'Keine', name: c.flock?.name ?? '', number: c.flock?.number ?? '', type: c.flock?.type ?? 'Original (vom Verein)' },
    patches: c.patches ?? [],
    signature: { signed: !!c.signature?.signed, by: c.signature?.by ?? '', hasCoa: !!c.signature?.hasCoa, issuer: c.signature?.issuer ?? '' },
    tagsAttached: !!c.tagsAttached,
    condition: { grade: c.condition?.grade ?? 8, defects: c.condition?.defects ?? [] },
    provenance: c.provenance ?? ''
  };
}

export function EditItemButton({ item }: { item: CustomItem }) {
  const { t } = usePrefs();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        ✏️ {t('edit.button')}
      </Button>
      {open && <EditItemDialog item={item} onClose={() => setOpen(false)} />}
    </>
  );
}

function EditItemDialog({ item, onClose }: { item: CustomItem; onClose: () => void }) {
  const { t } = usePrefs();
  const { user } = useSession();
  const toast = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'photos' | 'details'>('photos');
  const [f, setF] = useState<DetailsFields>(() => fieldsOf(item));
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const verified = item.verification?.status === 'verifiziert';
  const set = (patch: Partial<DetailsFields> | ((s: DetailsFields) => Partial<DetailsFields>)) => setF((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));
  const togglePatch = (p: string) => set((s) => ({ patches: s.patches.includes(p) ? s.patches.filter((x) => x !== p) : [...s.patches, p] }));
  const refresh = () => qc.invalidateQueries({ queryKey: ['customItems', user?.id] });

  // The keys to offer: the usual ones, the print and signature close-ups when they apply, and any the shirt already has.
  const extra = [f.flock.source !== 'Keine' ? 'flock_closeup' : null, f.signature.signed ? 'signature_closeup' : null].filter((k): k is string => !!k);
  const keys = [...new Set([...PHOTO_KEYS, ...extra, ...Object.keys(item.photos ?? {}).filter((k) => k !== 'front_studio')])];
  const labelOf = (k: string) => {
    const key = 'as.photo.' + k;
    const text = t(key);
    return text === key ? (item.photos?.[k]?.label ?? k) : text;
  };

  const takePhoto = async (key: string, file: File) => {
    if (!user) return;
    setBusy(key);
    try {
      const { blob, thumb, width, height, lowRes, blurry, tooDark, tooBright } = await analyzeAndCompress(file);
      const { path, thumbPath } = await db.uploadPhoto(user.id, 'items/' + item.id, key + '-' + stamp(), blob, thumb);
      const old = item.photos?.[key];
      const photos = { ...item.photos, [key]: { path, thumbPath, label: labelOf(key), width, height, lowRes, blurry, tooDark, tooBright } };
      // A new front makes the studio cut-out of the old one stale.
      const studio = key === 'front' ? photos.front_studio : undefined;
      if (key === 'front') delete photos.front_studio;
      await db.upsertCustomItem(user.id, { ...item, photos, updatedAt: stamp() });
      await db.removePhotos([old?.path, old?.thumbPath, studio?.path, studio?.thumbPath].filter((x): x is string => !!x)).catch(() => {});
      await refresh();
      toast(t('ownphotos.saved'));
    } catch {
      toast(t('as.uploadFailed'));
    } finally {
      setBusy(null);
    }
  };

  const removePhoto = async (key: string) => {
    if (!user) return;
    const old = item.photos?.[key];
    if (!old) return;
    setBusy(key);
    try {
      const photos = { ...item.photos };
      delete photos[key];
      await db.upsertCustomItem(user.id, { ...item, photos, updatedAt: stamp() });
      await db.removePhotos([old.path, old.thumbPath].filter((x): x is string => !!x)).catch(() => {});
      await refresh();
    } catch (e) {
      // A shirt for sale needs its front and back.
      toast((e as { message?: string }).message?.includes('sale_photos_missing') ? t('edit.saleNeedsPhotos') : t('vault.saveFailed'));
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await db.upsertCustomItem(user.id, {
        ...item,
        version: f.version || null,
        sizeGroup: f.sizeGroup || null,
        size: f.size || null,
        sleeve: f.sleeve || null,
        flock: f.flock.source === 'Keine' ? { source: 'Keine' } : f.flock,
        patches: f.patches,
        signature: f.signature.signed ? f.signature : { signed: false },
        tagsAttached: f.tagsAttached,
        condition: f.condition,
        provenance: f.provenance.trim(),
        updatedAt: stamp()
      });
      await refresh();
      toast(t('edit.saved'));
      onClose();
    } catch {
      toast(t('vault.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title={t('edit.title')} width={620} layout="column">
      <div className="edit-item">
        <div role="tablist" aria-label={t('edit.title')} className="edit-item-tabs">
          {(['photos', 'details'] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
              {t('edit.tab.' + k)}
            </button>
          ))}
        </div>
        <div className="edit-item-body">
          {tab === 'photos' ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.45 }}>{t('edit.photosHint')}</p>
              {keys.map((k) => (
                <div key={k} style={{ position: 'relative' }}>
                  <PhotoSlot spec={{ key: k, label: labelOf(k) }} data={item.photos?.[k]} busy={busy === k} onFile={(file) => void takePhoto(k, file)} onRemove={() => void removePhoto(k)} />
                  {item.photos?.[k] && busy !== k && (
                    <button type="button" className="link-btn link-btn--muted edit-item-remove" onClick={() => void removePhoto(k)} disabled={busy !== null}>
                      {t('edit.removePhoto')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : verified ? (
            <Notice tone="info">{t('edit.verifiedLocked')}</Notice>
          ) : (
            <DetailsStep w={{ f, set, togglePatch }} />
          )}
        </div>
        {tab === 'details' && !verified && (
          <div className="edit-item-foot">
            <Button variant="ghost" onClick={onClose}>
              {t('edit.cancel')}
            </Button>
            <Button onClick={() => void save()} busy={saving}>
              {t('edit.save')}
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
