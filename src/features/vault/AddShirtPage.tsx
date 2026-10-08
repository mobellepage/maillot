import { useRef, useState } from 'react';
import { useCatalog } from '../catalog/useCatalog.ts';
import { useNavigate } from 'react-router';
import { estimateValue } from '../../addShirtData.js';
import { BY } from '../../data.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import type { Valuation } from '../../types/domain.ts';
import { analyzeAndCompress } from '../../utils/image.ts';
import { cutoutShirt, removePhotos, uploadPhoto } from '../../utils/db.ts';
import type { Photo } from '../../types/domain.ts';
import { composeStudio, type StudioState } from './addshirt/studio.ts';
import { Button, CheckIcon, Page } from '../../ui/index.ts';
import { PhotosStep, PrecheckStep, VerifyStep } from './addshirt/CheckSteps.tsx';
import { DetailsStep } from './addshirt/DetailsStep.tsx';
import { FinishStep } from './addshirt/FinishStep.tsx';
import { IdentifyStep } from './addshirt/IdentifyStep.tsx';
import { ScanStep } from './addshirt/ScanStep.tsx';
import { useAddShirtForm } from './addshirt/useAddShirtForm.ts';
import { buildPhotoSpecs } from '../../addShirtData.js';
import { useCollectionActions } from './useCollection.ts';

const STEPS = ['as.step.scan', 'as.step.shirt', 'as.step.details', 'as.step.photos', 'as.step.precheck', 'as.step.verify', 'as.step.finish'] as const;

export default function AddShirtPage() {
  useCatalog(); // re-render when the live catalogue loads
  const { t, lang } = usePrefs();
  usePageMeta(t('as.meta'));
  const { user } = useSession();
  const w = useAddShirtForm(user?.id);
  const { f, set } = w;
  const { add } = useCollectionActions();
  const navigate = useNavigate();
  const toast = useToast();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [studio, setStudio] = useState<StudioState>(f.photos.front_studio ? 'done' : 'idle');
  const studioToken = useRef(0);

  // The studio look: cut the shirt out of the main photo and put it on the dark
  // background (see addshirt/studio.ts). Runs again whenever the photo changes.
  const makeStudio = async (front: Photo & { dataUrl?: string }, off = f.studioOff) => {
    const token = ++studioToken.current;
    const old = f.photos.front_studio;
    if (old) {
      w.removePhoto('front_studio');
      removePhotos([old.path, old.thumbPath].filter((x): x is string => !!x)).catch(() => {});
    }
    if (off || !front.dataUrl || !user) return setStudio('idle');
    setStudio('working');
    try {
      const r = await cutoutShirt(front.dataUrl);
      if (token !== studioToken.current) return;
      if (!r.ok) return setStudio(r.reason === 'off' ? 'off' : r.reason === 'rate_limited' ? 'limited' : 'failed');
      const { blob, thumb, dataUrl } = await composeStudio(r.png);
      const { path, thumbPath } = await uploadPhoto(user.id, 'items/' + f.draftId, 'front_studio', blob, thumb);
      if (token !== studioToken.current) return;
      w.setPhoto('front_studio', { path, thumbPath, dataUrl, label: t('as.photo.studio'), width: 1200, height: 1200 });
      setStudio('done');
    } catch {
      if (token === studioToken.current) setStudio('failed');
    }
  };
  const setStudioOff = (off: boolean) => {
    w.set({ studioOff: off });
    if (f.photos.front) void makeStudio(f.photos.front, off);
  };

  const catalogItem = f.catalogId ? BY[f.catalogId] ?? null : null;
  const valuation = estimateValue({ catalogItem, version: f.version, conditionGrade: f.condition.grade, flock: f.flock, patches: f.patches, signature: f.signature, verificationLevel: f.verification.level }) as Valuation;
  const specs = buildPhotoSpecs(f, t) as { key: string }[];
  const canNext = [f.scan.status !== 'scanning', !!f.catalogId || (f.proposed && !!f.proposedClub.trim() && !!f.proposedSeason.trim()), !!f.version, specs.every((s) => f.photos[s.key]), !!f.precheck, true, false][f.step];

  // Compress on the device (strips EXIF/GPS), upload the full image and a
  // thumbnail to private storage, keep the data URL only as a local preview.
  const capture = async (key: string, file: File, label: string) => {
    setBusyKey(key);
    try {
      const { blob, thumb, ...meta } = await analyzeAndCompress(file);
      const { path, thumbPath } = await uploadPhoto(user!.id, 'items/' + f.draftId, key, blob, thumb);
      return { ...meta, label, path, thumbPath };
    } catch {
      toast(t('as.uploadFailed'));
      return null;
    } finally {
      setBusyKey(null);
    }
  };

  const save = () =>
    add.mutate(
      {
        catalogId: f.catalogId,
        proposed: f.proposed,
        proposedClub: f.proposedClub,
        proposedSeason: f.proposedSeason,
        proposedVariant: f.proposedVariant,
        version: f.version,
        sizeGroup: f.sizeGroup,
        size: f.size,
        sleeve: f.sleeve,
        flock: f.flock,
        patches: f.patches,
        signature: f.signature,
        tagsAttached: f.tagsAttached,
        condition: f.condition,
        provenance: f.provenance,
        photos: f.photos,
        precheck: f.precheck,
        verification: f.verification,
        visibility: f.visibility,
        salePrice: f.visibility === 'forsale' ? f.salePrice : '',
        valuation
      },
      {
        onSuccess: (item) => {
          w.reset();
          toast(t('as.saved'));
          navigate('/vault/item/' + item.id);
        }
      }
    );

  const go = (n: number) => {
    set({ step: n });
    window.scrollTo(0, 0);
  };

  return (
    <Page style={{ maxWidth: 860 }}>
      <div className="eyebrow">{t('as.eyebrow')}</div>
      <h1 className="display" style={{ marginTop: 8, fontSize: 'clamp(30px,4.2vw,48px)' }}>
        {t(STEPS[f.step] ?? STEPS[0])}
      </h1>
      <ol aria-label={t('as.steps')} style={{ listStyle: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: 8, margin: '24px 0 32px', overflowX: 'auto', paddingBottom: 4 }}>
        {STEPS.map((l, i) => (
          <li key={l} aria-current={i === f.step ? 'step' : undefined} aria-label={t(l)} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
            <span className="mono" style={{ width: 26, height: 26, borderRadius: '50%', background: i < f.step ? 'var(--accent)' : i === f.step ? 'var(--text)' : 'var(--step-idle)', color: i <= f.step ? 'var(--bg)' : 'var(--muted)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>
              {i < f.step ? <CheckIcon size={12} /> : i + 1}
            </span>
            {i < STEPS.length - 1 && <span aria-hidden="true" style={{ width: 'clamp(14px,3vw,34px)', height: 2, borderRadius: 2, background: i < f.step ? 'var(--accent)' : 'rgba(255,255,255,0.1)' }} />}
          </li>
        ))}
      </ol>

      {f.step === 0 && (
        <ScanStep
          w={w}
          busyKey={busyKey}
          valuation={valuation}
          studio={studio}
          onStudioOff={setStudioOff}
          onScanFile={async (key, file) => {
            const p = await capture(key, file, t('as.photo.' + key));
            if (!p) return;
            void w.runScan(key, p, lang, (k) => t('kit.' + k));
            if (key === 'front') void makeStudio(p);
          }}
        />
      )}
      {f.step === 1 && <IdentifyStep w={w} />}
      {f.step === 2 && <DetailsStep w={w} />}
      {f.step === 3 && <PhotosStep w={w} busyKey={busyKey} onPhoto={async (spec, file) => {
            const p = await capture(spec.key, file, spec.label);
            if (p) w.setPhoto(spec.key, p);
            if (p && spec.key === 'front') void makeStudio(p);
            return p;
          }} />}
      {f.step === 4 && <PrecheckStep w={w} />}
      {f.step === 5 && <VerifyStep w={w} />}
      {f.step === 6 && <FinishStep w={w} valuation={valuation} onSave={save} saving={add.isPending} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 36 }}>
        <Button
          variant="ghost"
          onClick={() => {
            if (f.step === 0) {
              w.reset(true);
              navigate('/vault');
            } else go(f.step - 1);
          }}
        >
          {f.step === 0 ? t('as.cancel') : t('as.back')}
        </Button>
        {f.step < 6 && (
          <Button variant="light" disabled={!canNext} onClick={() => go(f.step + 1)}>
            {t('as.next')}
          </Button>
        )}
      </div>
    </Page>
  );
}
