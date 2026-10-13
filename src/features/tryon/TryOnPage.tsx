// /try-on — the try-on studio. Build a character that looks like you (body,
// skin, hair, beard, glasses), pick trousers and shoes, then put any shirt
// from the app on it — wishlist first — to decide which one to buy.
// Members' characters and saved looks follow them (profiles.character);
// guests keep them in this browser.
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { SHIRTS } from '../../data.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import { loadJSON, saveJSON } from '../../utils/storage.ts';
import * as db from '../../utils/db.ts';
import type { Json } from '../../types/database.ts';
import { Button, ButtonLink, HeartIcon, Page, ShirtGraphic } from '../../ui/index.ts';
import { useCatalog } from '../catalog/useCatalog.ts';
import { useCollection } from '../vault/useCollection.ts';
import { useWatchlist } from '../watchlist/useWatchlist.ts';
import {
  BEARDS,
  BUILDS,
  CLOTH_COLORS,
  DEFAULT_CHARACTER,
  FITS,
  GENDERS,
  HAIRS,
  HAIR_COLORS,
  HEIGHT,
  MAX_LOOKS,
  PANTS,
  SHOES,
  SKIN,
  sanitizeCharacter,
  sanitizeLooks,
  type Character,
  type Look
} from './character.ts';
import { Figure } from './Figure.tsx';

const LOCAL_KEY = 'kv_tryon_v1';
type Stored = { character: Character; looks: Look[] };

function readStored(raw: unknown): Stored {
  const r = (raw && typeof raw === 'object' ? raw : {}) as { character?: unknown; looks?: unknown };
  return { character: sanitizeCharacter(r.character ?? raw), looks: sanitizeLooks(r.looks) };
}

/** Character + looks: this browser first, then the member's saved one (wins once loaded). */
function useStudio() {
  const { user } = useSession();
  const [state, setState] = useState<Stored>(() => readStored(loadJSON(LOCAL_KEY, null)));
  const remote = useQuery({ queryKey: ['character', user?.id], queryFn: () => db.loadCharacter(user!.id), enabled: !!user, staleTime: Infinity });
  // Adopt the saved character once it arrives (state adjusted during render, not in an effect).
  const [adopted, setAdopted] = useState<unknown>(undefined);
  const [synced, setSynced] = useState<Stored | null>(null);
  if (remote.data && remote.data !== adopted) {
    setAdopted(remote.data);
    const s = readStored(remote.data);
    const next = { character: { ...s.character, jersey: state.character.jersey ?? s.character.jersey }, looks: s.looks.length ? s.looks : state.looks };
    setSynced(next);
    setState(next);
  }
  // Save: locally at once, to the profile a moment after the last change.
  useEffect(() => {
    saveJSON(LOCAL_KEY, state);
    if (!user || (remote.data === undefined && !remote.isError)) return;
    if (synced === state) return;
    const id = setTimeout(() => db.saveCharacter(user.id, state as unknown as Json).catch(() => {}), 1200);
    return () => clearTimeout(id);
  }, [state, user, remote.data, remote.isError, synced]);
  return [state, setState] as const;
}

type Tab = 'you' | 'outfit' | 'shirt';

export default function TryOnPage() {
  useCatalog();
  const { t, money } = usePrefs();
  usePageMeta(t('try.meta'), t('try.metaDesc'));
  const toast = useToast();
  const [params] = useSearchParams();
  const [state, setState] = useStudio();
  const c = state.character;
  const [tab, setTab] = useState<Tab>(params.get('shirt') ? 'shirt' : 'you');
  const watch = useWatchlist();
  const { items } = useCollection();

  // ?shirt=… from a product page or the wishlist puts that shirt on.
  const wanted = params.get('shirt');
  const [applied, setApplied] = useState<string | null>(null);
  if (wanted && wanted !== applied && SHIRTS.some((s) => s.id === wanted)) {
    setApplied(wanted);
    setState((s) => ({ ...s, character: { ...s.character, jersey: wanted } }));
  }

  const set = (patch: Partial<Character>) => setState((s) => ({ ...s, character: { ...s.character, ...patch } }));
  const shirt = c.jersey ? (SHIRTS.find((s) => s.id === c.jersey) ?? null) : null;
  const saved = !!shirt && state.looks.some((l) => l.jersey === c.jersey && l.pants === c.pants && l.pantsColor === c.pantsColor && l.shoes === c.shoes && l.shoesColor === c.shoesColor && l.fit === c.fit);

  const saveLook = () => {
    if (!shirt) return;
    const look: Look = { pants: c.pants, pantsColor: c.pantsColor, shoes: c.shoes, shoesColor: c.shoesColor, fit: c.fit, jersey: shirt.id };
    setState((s) => ({ ...s, looks: [look, ...s.looks].slice(0, MAX_LOOKS) }));
    toast(t('try.lookSaved'));
  };

  return (
    <Page>
      <div className="eyebrow">{t('try.eyebrow')}</div>
      <h1 className="display" style={{ fontSize: 'clamp(30px,5vw,48px)', margin: '6px 0 0' }}>
        {t('try.title')}
      </h1>
      <p style={{ color: 'var(--text-2)', margin: '8px 0 0', fontSize: 15, lineHeight: 1.5, maxWidth: 640 }}>{t('try.intro')}</p>

      <div className="tryon-grid" style={{ display: 'grid', gap: 24, marginTop: 24, alignItems: 'start' }}>
        <div className="tryon-stage">
          <div className="card" style={{ padding: '12px 12px 4px', borderRadius: 24, background: 'linear-gradient(180deg,var(--surface),var(--sunken))' }}>
            <div className="tryon-figure" style={{ margin: '0 auto' }}>
              <Figure c={c} shirt={shirt} label={shirt ? t('try.figureWith', { shirt: shirt.name }) : t('try.figure')} />
            </div>
          </div>
          {shirt && (
            <div className="card" style={{ padding: 16, borderRadius: 18, marginTop: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 15.5 }}>{shirt.name}</div>
              <div className="mono" style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>{t('try.value', { price: money(shirt.price) })}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                <ButtonLink to={'/shirt/' + shirt.id} size="sm">
                  {t('try.toShirt')}
                </ButtonLink>
                <Button size="sm" variant="secondary" onClick={() => watch.toggle(shirt.id)} aria-pressed={watch.has(shirt.id)}>
                  <HeartIcon filled={watch.has(shirt.id)} size={15} /> {watch.has(shirt.id) ? t('try.onWishlist') : t('try.addWishlist')}
                </Button>
                <Button size="sm" variant="ghost" onClick={saveLook} disabled={saved}>
                  {saved ? t('try.lookSavedShort') : t('try.saveLook')}
                </Button>
              </div>
            </div>
          )}
          {state.looks.length > 0 && <Looks looks={state.looks} current={c} onPick={(l) => set(l)} onRemove={(i) => setState((s) => ({ ...s, looks: s.looks.filter((_, k) => k !== i) }))} />}
        </div>

        <div>
          <div role="tablist" aria-label={t('try.sections')} style={{ display: 'flex', gap: 6, padding: 4, borderRadius: 999, background: 'var(--sunken)', width: 'fit-content', maxWidth: '100%' }}>
            {(['you', 'outfit', 'shirt'] as const).map((k) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className="tryon-tab">
                {t('try.tab.' + k)}
              </button>
            ))}
          </div>
          <div role="tabpanel" style={{ marginTop: 18, display: 'grid', gap: 20 }}>
            {tab === 'you' && (
              <>
                <Choice label={t('try.gender')} options={GENDERS} value={c.gender} onChange={(gender) => set({ gender })} text={(v) => t('try.gender.' + v)} />
                <div>
                  <label htmlFor="try-height" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                    <span>{t('try.height')}</span>
                    <span className="mono">{c.height} cm</span>
                  </label>
                  <input id="try-height" type="range" min={HEIGHT.min} max={HEIGHT.max} value={c.height} onChange={(e) => set({ height: Number(e.target.value) })} style={{ width: '100%' }} />
                </div>
                <Choice label={t('try.build')} options={BUILDS} value={c.build} onChange={(build) => set({ build })} text={(v) => t('try.build.' + v)} />
                <Swatches label={t('try.skin')} colors={SKIN} value={c.skin} onChange={(skin) => set({ skin })} name={(i) => t('try.skinN', { n: i + 1 })} />
                <Choice label={t('try.hair')} options={HAIRS} value={c.hair} onChange={(hair) => set({ hair })} text={(v) => t('try.hair.' + v)} />
                {c.hair !== 'bald' && <Swatches label={t('try.hairColor')} colors={HAIR_COLORS} value={c.hairColor} onChange={(hairColor) => set({ hairColor })} name={(i) => t('try.colorN', { n: i + 1 })} />}
                <Choice label={t('try.beard')} options={BEARDS} value={c.beard} onChange={(beard) => set({ beard })} text={(v) => t('try.beard.' + v)} />
                <Choice label={t('try.glasses')} options={['no', 'yes'] as const} value={c.glasses ? 'yes' : 'no'} onChange={(v) => set({ glasses: v === 'yes' })} text={(v) => t('try.glasses.' + v)} />
              </>
            )}
            {tab === 'outfit' && (
              <>
                <Choice label={t('try.pants')} options={PANTS} value={c.pants} onChange={(pants) => set({ pants })} text={(v) => t('try.pants.' + v)} />
                <Swatches label={t('try.pantsColor')} colors={CLOTH_COLORS} value={c.pantsColor} onChange={(pantsColor) => set({ pantsColor })} name={(i) => t('try.colorN', { n: i + 1 })} />
                <Choice label={t('try.shoes')} options={SHOES} value={c.shoes} onChange={(shoes) => set({ shoes })} text={(v) => t('try.shoes.' + v)} />
                <Swatches label={t('try.shoesColor')} colors={CLOTH_COLORS} value={c.shoesColor} onChange={(shoesColor) => set({ shoesColor })} name={(i) => t('try.colorN', { n: i + 1 })} />
                <Choice label={t('try.fit')} options={FITS} value={c.fit} onChange={(fit) => set({ fit })} text={(v) => t('try.fit.' + v)} />
              </>
            )}
            {tab === 'shirt' && <ShirtPicker value={c.jersey} onPick={(jersey) => set({ jersey })} wishlist={watch.ids} owned={items.map((i) => i.catalogId).filter((x): x is string => !!x)} />}
          </div>
          <button type="button" className="link-btn link-btn--muted" onClick={() => setState((s) => ({ ...s, character: { ...DEFAULT_CHARACTER, jersey: s.character.jersey } }))} style={{ marginTop: 20, fontSize: 12.5 }}>
            {t('try.reset')}
          </button>
        </div>
      </div>
    </Page>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <legend style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, padding: 0 }}>{label}</legend>
      {children}
    </fieldset>
  );
}

function Choice<T extends string>({ label, options, value, onChange, text }: { label: string; options: readonly T[]; value: T; onChange: (v: T) => void; text: (v: T) => string }) {
  return (
    <Field label={label}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {options.map((o) => (
          <button key={o} type="button" className="option-btn" aria-pressed={value === o} onClick={() => onChange(o)} style={{ padding: '8px 13px', fontSize: 13.5 }}>
            {text(o)}
          </button>
        ))}
      </div>
    </Field>
  );
}

function Swatches({ label, colors, value, onChange, name }: { label: string; colors: readonly string[]; value: number; onChange: (i: number) => void; name: (i: number) => string }) {
  return (
    <Field label={label}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {colors.map((col, i) => (
          <button
            key={col}
            type="button"
            aria-label={name(i)}
            aria-pressed={value === i}
            onClick={() => onChange(i)}
            style={{ width: 34, height: 34, borderRadius: '50%', background: col, border: '1px solid var(--line-strong)', boxShadow: value === i ? '0 0 0 3px var(--bg), 0 0 0 5px var(--accent)' : 'none', cursor: 'pointer' }}
          />
        ))}
      </div>
    </Field>
  );
}

function ShirtPicker({ value, onPick, wishlist, owned }: { value: string | null; onPick: (id: string) => void; wishlist: string[]; owned: string[] }) {
  const { t } = usePrefs();
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const match = (id: string) => {
    const s = SHIRTS.find((x) => x.id === id);
    return !!s && (!needle || s.hay.includes(needle));
  };
  const wl = wishlist.filter(match);
  const own = [...new Set(owned)].filter((id) => match(id) && !wl.includes(id));
  const rest = SHIRTS.map((s) => s.id).filter((id) => match(id) && !wl.includes(id) && !own.includes(id));
  const groups = [
    ['try.pick.wishlist', wl],
    ['try.pick.owned', own],
    ['try.pick.all', rest]
  ] as const;
  return (
    <div>
      <label htmlFor="try-search" className="sr-only">
        {t('try.search')}
      </label>
      <div className="field">
        <input id="try-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('try.search')} />
      </div>
      {groups.map(([key, ids]) =>
        ids.length ? (
          <section key={key} style={{ marginTop: 16 }}>
            <h2 style={{ fontSize: 13.5, fontWeight: 700, margin: '0 0 8px', color: 'var(--text-2)' }}>
              {t(key)} <span className="mono" style={{ color: 'var(--muted)' }}>{ids.length}</span>
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(84px,1fr))', gap: 8 }}>
              {ids.map((id) => {
                const s = SHIRTS.find((x) => x.id === id)!;
                return (
                  <button key={id} type="button" aria-pressed={value === id} aria-label={s.name} title={s.name} onClick={() => onPick(id)} className="tryon-shirt">
                    <ShirtGraphic pat={s.pat} trim={s.trim} crest={s.crest} photo={s.photo} flat style={{ width: '82%' }} />
                  </button>
                );
              })}
            </div>
          </section>
        ) : null
      )}
      {groups.every(([, ids]) => !ids.length) && <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 16 }}>{t('try.noMatch')}</p>}
      <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 14 }}>
        <Link to="/watchlist">{t('try.toWishlist')}</Link>
      </p>
    </div>
  );
}

function Looks({ looks, current, onPick, onRemove }: { looks: Look[]; current: Character; onPick: (l: Look) => void; onRemove: (i: number) => void }) {
  const { t } = usePrefs();
  return (
    <section aria-labelledby="looks-title" style={{ marginTop: 16 }}>
      <h2 id="looks-title" style={{ fontSize: 14, fontWeight: 700, margin: '0 0 8px' }}>
        {t('try.looks')}
      </h2>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
        {looks.map((l, i) => {
          const s = SHIRTS.find((x) => x.id === l.jersey);
          if (!s) return null;
          return (
            <div key={i} style={{ flex: 'none', width: 92, position: 'relative' }}>
              <button type="button" onClick={() => onPick(l)} aria-label={t('try.wearLook', { shirt: s.name })} className="card" style={{ width: 92, padding: 4, borderRadius: 14, cursor: 'pointer', display: 'block' }}>
                <Figure c={{ ...current, ...l }} shirt={s} label={s.name} />
              </button>
              <button type="button" onClick={() => onRemove(i)} aria-label={t('try.removeLook', { shirt: s.name })} style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', border: 0, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 13, lineHeight: '22px', cursor: 'pointer' }}>
                ×
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
