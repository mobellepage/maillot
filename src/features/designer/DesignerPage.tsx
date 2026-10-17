// /designer — design your own kit: pattern, colours, sleeves, collar, crest,
// sponsor, name and number, front and back. Anyone can play; members save
// their designs (?id=… edits one) and share them by link or as a picture.
// ?from=… starts from someone's shared design.
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import { Button, ButtonLink, Page, Segmented, TextField } from '../../ui/index.ts';
import { KitSvg } from './KitSvg.tsx';
import { COLLARS, DEFAULT_DESIGN, MAX_NAME, MAX_SPONSOR, PATTERNS, SWATCHES, cleanDesign, randomDesign, type KitDesign } from './model.ts';
import { designUrl, downloadPicture, shareLink } from './share.ts';

const DRAFT_KEY = 'maillot.designDraft.v1';

function readDraft(): { name: string; design: KitDesign } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as { name?: unknown; design?: unknown };
    return { name: typeof d.name === 'string' ? d.name.slice(0, 60) : '', design: cleanDesign(d.design) };
  } catch {
    return null;
  }
}

export default function DesignerPage() {
  const { t } = usePrefs();
  usePageMeta(t('des.meta'), t('des.intro'));
  const { user } = useSession();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const editId = params.get('id') ?? undefined;
  const fromId = params.get('from') ?? undefined;

  const [draft] = useState(() => (editId || fromId ? null : readDraft()));
  const [design, setDesign] = useState<KitDesign>(draft?.design ?? DEFAULT_DESIGN);
  const [name, setName] = useState(draft?.name ?? '');
  const [view, setView] = useState<'front' | 'back'>('front');
  const [savedId, setSavedId] = useState<string | undefined>(editId);
  const svg = useRef<SVGSVGElement>(null);

  // Open a saved design, or a shared one to start from (once it arrives).
  const source = useQuery({ queryKey: ['sharedDesign', editId ?? fromId], queryFn: () => db.loadSharedDesign((editId ?? fromId)!), enabled: !!(editId ?? fromId) });
  const [opened, setOpened] = useState<string | undefined>();
  const s = source.data;
  if (s && opened !== s.id + (editId ? ':edit' : ':from')) {
    setOpened(s.id + (editId ? ':edit' : ':from'));
    setDesign(cleanDesign(s.design));
    setName(editId && s.is_mine ? s.name : t('des.remixName', { name: s.name }).slice(0, 60));
    setSavedId(editId && s.is_mine ? s.id : undefined);
  }

  // Keep the work in progress, so signing in to save doesn't lose it.
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ name, design }));
    } catch {
      // private mode: no draft
    }
  }, [name, design]);

  const mine = useQuery({ queryKey: ['myDesigns', user?.id], queryFn: db.loadMyDesigns, enabled: !!user });
  const save = useMutation({
    mutationFn: () => db.saveDesign({ id: savedId, name: name.trim() || t('des.untitled'), design, shared: true }),
    onSuccess: (id) => {
      setSavedId(id);
      toast(t('des.saved'));
      qc.invalidateQueries({ queryKey: ['myDesigns'] });
      qc.invalidateQueries({ queryKey: ['sharedDesign', id] });
      if (editId !== id) navigate('/designer?id=' + id, { replace: true });
    },
    onError: (e) => toast((e as { code?: string }).code === 'P0429' ? t('social.limited') : (e as { message?: string }).message?.includes('100 designs') ? t('des.tooMany') : t('des.saveFailed'))
  });
  const remove = useMutation({
    mutationFn: (id: string) => db.deleteDesign(id),
    onSuccess: (_v, id) => {
      qc.invalidateQueries({ queryKey: ['myDesigns'] });
      if (id === savedId) {
        setSavedId(undefined);
        navigate('/designer', { replace: true });
      }
    },
    onError: () => toast(t('des.saveFailed'))
  });

  const set = <K extends keyof KitDesign>(k: K, v: KitDesign[K]) => setDesign((d) => ({ ...d, [k]: v }));
  const title = name.trim() || t('des.untitled');

  const share = async () => {
    if (!savedId) return;
    const r = await shareLink(designUrl(savedId), title);
    if (r === 'copied') toast(t('des.linkCopied'));
    else if (r === 'failed') toast(designUrl(savedId));
  };
  const picture = async () => {
    if (!svg.current) return;
    // The picture shows the front.
    if (view !== 'front') setView('front');
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    downloadPicture(svg.current, title).catch(() => toast(t('des.pictureFailed')));
  };

  return (
    <Page>
      <div className="eyebrow">{t('des.eyebrow')}</div>
      <h1 className="display" style={{ fontSize: 'clamp(30px,5vw,48px)', margin: '6px 0 0' }}>
        {t('des.title')}
      </h1>
      <p style={{ color: 'var(--text-2)', margin: '8px 0 0', fontSize: 15, lineHeight: 1.5, maxWidth: 680 }}>{t('des.intro')}</p>

      <div className="designer">
        <div className="designer-preview">
          <div className="designer-stage">
            <KitSvg ref={svg} design={design} view={view} title={title + ' · ' + (view === 'front' ? t('des.front') : t('des.back'))} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 12 }}>
            <Segmented
              label={t('des.view')}
              value={view}
              onChange={setView}
              options={[
                { value: 'front', label: t('des.front') },
                { value: 'back', label: t('des.back') }
              ]}
            />
            <Button size="sm" variant="secondary" onClick={() => setDesign(randomDesign())}>
              🎲 {t('des.random')}
            </Button>
          </div>
        </div>

        <div className="designer-controls">
          <TextField label={t('des.name')} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder={t('des.untitled')} />

          <Group title={t('des.pattern')}>
            <div role="group" aria-label={t('des.pattern')} className="designer-chips">
              {PATTERNS.map((p) => (
                <button key={p} type="button" className="option-btn" aria-pressed={design.pattern === p} onClick={() => set('pattern', p)}>
                  {t('des.p.' + p)}
                </button>
              ))}
            </div>
          </Group>
          <ColorRow label={t('des.base')} value={design.base} onChange={(v) => set('base', v)} />
          {design.pattern !== 'plain' && <ColorRow label={t('des.accent')} value={design.accent} onChange={(v) => set('accent', v)} />}
          <ColorRow label={t('des.sleeves')} value={design.sleeves} onChange={(v) => set('sleeves', v)} />

          <Group title={t('des.collar')}>
            <div role="group" aria-label={t('des.collar')} className="designer-chips">
              {COLLARS.map((c) => (
                <button key={c} type="button" className="option-btn" aria-pressed={design.collar === c} onClick={() => set('collar', c)}>
                  {t('des.c.' + c)}
                </button>
              ))}
            </div>
          </Group>
          <ColorRow label={t('des.trim')} value={design.trim} onChange={(v) => set('trim', v)} />
          <ColorRow label={t('des.crest')} value={design.crest} onChange={(v) => set('crest', v)} />

          <Group title={t('des.sponsor')}>
            <TextField srLabel={t('des.sponsorText')} value={design.sponsor} maxLength={MAX_SPONSOR} onChange={(e) => set('sponsor', e.target.value.slice(0, MAX_SPONSOR))} placeholder={t('des.sponsorText')} onFocus={() => setView('front')} />
          </Group>
          <ColorRow label={t('des.sponsorColor')} value={design.sponsorColor} onChange={(v) => set('sponsorColor', v)} />

          <Group title={t('des.print')}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 96px', gap: 10 }}>
              <TextField label={t('des.printName')} value={design.name} maxLength={MAX_NAME} onChange={(e) => set('name', e.target.value.toUpperCase().slice(0, MAX_NAME))} onFocus={() => setView('back')} />
              <TextField label={t('des.printNumber')} inputMode="numeric" value={design.number} onChange={(e) => set('number', e.target.value.replace(/[^0-9]/g, '').slice(0, 2))} onFocus={() => setView('back')} />
            </div>
          </Group>
          <ColorRow label={t('des.printColor')} value={design.printColor} onChange={(v) => set('printColor', v)} />

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
            {user ? (
              <Button onClick={() => save.mutate()} busy={save.isPending} disabled={save.isPending}>
                {savedId ? t('des.update') : t('des.save')}
              </Button>
            ) : (
              <ButtonLink to="/signin" state={{ from: pathname + search, notice: 'des.signIn' }}>
                {t('des.save')}
              </ButtonLink>
            )}
            {savedId && (
              <Button variant="secondary" onClick={share}>
                🔗 {t('des.share')}
              </Button>
            )}
            <Button variant="ghost" onClick={picture}>
              ⬇ {t('des.picture')}
            </Button>
          </div>
          {!user && <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>{t('des.signInHint')}</p>}
        </div>
      </div>

      {user && (mine.data?.length ?? 0) > 0 && (
        <section aria-labelledby="my-designs" style={{ marginTop: 40 }}>
          <h2 id="my-designs" className="title" style={{ margin: '0 0 14px' }}>
            {t('des.mine')}
          </h2>
          <ul className="kit-disc-grid">
            {mine.data!.map((d) => (
              <li key={d.id} style={{ display: 'grid', justifyItems: 'center', gap: 4 }}>
                <Link to={'/design/' + d.id} className="kit-disc">
                  <span className="kit-disc-img" style={{ background: 'var(--sunken)' }}>
                    <KitSvg design={cleanDesign(d.design)} className="designer-thumb" />
                  </span>
                  <span className="kit-disc-name">{d.name}</span>
                </Link>
                <span style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                  <Link to={'/designer?id=' + d.id}>{t('des.edit')}</Link>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(t('des.deleteConfirm', { name: d.name }))) remove.mutate(d.id);
                    }}
                    style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', color: 'var(--muted)', font: 'inherit' }}
                  >
                    {t('social.delete')}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Page>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div>
      {children}
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const { t } = usePrefs();
  return (
    <div role="group" aria-label={label} style={{ display: 'grid', gap: 6 }}>
      <div style={{ fontSize: 13, fontWeight: 700 }}>{label}</div>
      <div className="designer-swatches">
        {SWATCHES.map((c) => (
          <button key={c} type="button" aria-pressed={value === c} aria-label={c} title={c} onClick={() => onChange(c)} style={{ background: c }} />
        ))}
        <label className="designer-picker" title={t('des.anyColor')}>
          <span className="sr-only">{t('des.anyColor')}</span>
          <input type="color" value={value} onChange={(e) => onChange(e.target.value.toLowerCase())} />
        </label>
      </div>
    </div>
  );
}
