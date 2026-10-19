import { useEffect, useRef, useState } from 'react';
import { useCatalog } from '../catalog/useCatalog.ts';
import { useNavigate, useSearchParams } from 'react-router';
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
import { chosenVisibility, flowFor, useAddShirtForm } from './addshirt/useAddShirtForm.ts';
import { GoalStep } from './addshirt/GoalStep.tsx';
import { buildPhotoSpecs } from '../../addShirtData.js';
import { useCollectionActions } from './useCollection.ts';

const STEPS = ['as.step.scan', 'as.step.shirt', 'as.step.details', 'as.step.photos', 'as.step.precheck', 'as.step.verify', 'as.step.finish'] as const;

export default function AddShirtPage() {
  useCatalog(); // re-render when the live catalogue loads
  const { t, lang } = usePrefs();
  usePageMeta(t('as.meta'));
  const { user, profile } = useSession();
  const w = useAddShirtForm(user?.id);
  const { f, set } = w;
  // From /sell, "list it completely": the goal is already chosen.
  const [params] = useSearchParams();
  const preGoal = params.get('goal') === 'sale' ? 'sale' : null;
  useEffect(() => {
    if (preGoal && !f.goal && f.step === 0) set({ goal: preGoal });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preGoal]);
  const { add } = useCollectionActions();
  const navigate = useNavigate();
  const toast = useToast();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [studio, setStudio] = useState<StudioState>(f.photos.front_studio ? 'done' : 'idle');
  const studioToken = useRef(0);

  // The studio look: cut the shirt out of the main photo, transparent, to sit
  // on the app's tiles (see addshirt/studio.ts). Runs again whenever the photo changes.
  const makeStudio = async (front: Photo & { dataUrl?: string }, off = f.studioOff) => {
    const token = ++studioToken.current;
    const old = f.photos.front_studio;
    if (old) {
      w.removePhoto('front_studio');
      removePhotos([old.path, old.thumbPath].filter((x): x is string => !!x)).catch(() => {});
    }
    if (off || !front.dataUrl || !user) return setStudio('idle');
    // A Premium feature (the trial included): the free plan keeps the photo as taken.
    if (profile && !profile.premium && !profile.trial) return setStudio('premium');
    setStudio('working');
    try {
      const r = await cutoutShirt(front.dataUrl);
      if (token !== studioToken.current) return;
      if (!r.ok) return setStudio(r.reason === 'off' ? 'off' : r.reason === 'rate_limited' ? 'limited' : r.reason === 'premium' ? 'premium' : 'failed');
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
  const specs = buildPhotoSpecs(f, t) as { key: string; required: boolean; forSale: boolean }[];
  // Just for the collection: front and back. For sale: every photo buyers need.
  const flow = flowFor(f.goal);
  const at = Math.max(0, flow.indexOf(f.step));
  const choosing = f.step === 0 && !f.goal;
  const canNext = [f.scan.status !== 'scanning' && !!f.photos.front && !!f.photos.back, !!f.catalogId || (f.proposed && !!f.proposedClub.trim() && !!f.proposedSeason.trim()), !!f.version, specs.every((s) => !(s.required || s.forSale) || f.photos[s.key]), !!f.precheck, true, false][f.step];

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
        kitId: f.kitId,
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
        visibility: chosenVisibility(f, profile?.collectionPrivate),
        salePrice: chosenVisibility(f, profile?.collectionPrivate) === 'forsale' ? f.salePrice : '',
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
        {choosing ? t('as.goal.title') : t(STEPS[f.step] ?? STEPS[0])}
      </h1>
      <ol aria-label={t('as.steps')} style={{ listStyle: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: 8, margin: '24px 0 32px', overflowX: 'auto', paddingBottom: 4 }}>
        {flow.map((s, i) => (
          <li key={s} aria-current={i === at ? 'step' : undefined} aria-label={t(STEPS[s]!)} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
            <span className="mono" style={{ width: 26, height: 26, borderRadius: '50%', background: i < at ? 'var(--accent)' : i === at ? 'var(--text)' : 'var(--step-idle)', color: i <= at ? 'var(--bg)' : 'var(--muted)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>
              {i < at ? <CheckIcon size={12} /> : i + 1}
            </span>
            {i < flow.length - 1 && <span aria-hidden="true" style={{ width: 'clamp(14px,3vw,34px)', height: 2, borderRadius: 2, background: i < at ? 'var(--accent)' : 'rgba(255,255,255,0.1)' }} />}
          </li>
        ))}
      </ol>

      {choosing && <GoalStep goal={f.goal} onPick={(goal) => set({ goal })} />}
      {f.step === 0 && !choosing && (
        <ScanStep
          w={w}
          busyKey={busyKey}
          valuation={valuation}
          studio={studio}
          onStudioOff={setStudioOff}
          onScanFile={async (key, file) => {
            const p = await capture(key, file, t('as.photo.' + key));
            if (!p) return;
            // One recognition per shirt, from front and back together (a retake recognises again).
            if (f.photos[key === 'front' ? 'back' : 'front']) void w.runScan(key, p, lang, (k) => t('kit.' + k));
            else w.setPhoto(key, p);
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
            if (choosing) {
              w.reset(true);
              navigate('/vault');
            } else if (at === 0) set({ goal: null });
            else go(flow[at - 1]!);
          }}
        >
          {choosing ? t('as.cancel') : t('as.back')}
        </Button>
        {f.step < 6 && !choosing && (
          <Button variant="light" disabled={!canNext} onClick={() => go(flow[at + 1] ?? 6)}>
            {t('as.next')}
          </Button>
        )}
      </div>
    </Page>
  );
}
