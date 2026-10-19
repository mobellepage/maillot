// /vault/add/library — list a shirt you own without photos: pick the club,
// tap your kit among all of its kits in the library, add size and flock if
// you like, done. The shirt shows the library picture, marked "own photos
// still to come", until photos are added. ?club=…&kit=… (the library's
// "Add to my collection" before signing in) opens with that kit chosen.
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { FLOCK_SOURCES, SIZE_GROUPS, VERSIONS } from '../../addShirtData.js';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import { Button, Card, Page, Skeleton, TextField } from '../../ui/index.ts';
import { useCatalog } from '../catalog/useCatalog.ts';
import { ClubPicker } from '../daily/ClubPicker.tsx';
import { KIT_KINDS, bySeason, variantLabel } from '../library/model.ts';
import { Pill, Pills, Section } from './addshirt/parts.tsx';
import { quickItem } from './quickAdd.ts';
import { useCollectionActions } from './useCollection.ts';

export default function QuickAddPage() {
  useCatalog();
  const { t, label } = usePrefs();
  usePageMeta(t('qa.meta'));
  const { profile } = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const { add } = useCollectionActions();
  const [params] = useSearchParams();
  const [club, setClub] = useState(params.get('club') ?? '');
  const [kitId, setKitId] = useState(params.get('kit') ?? '');
  const [kind, setKind] = useState('all');
  const [season, setSeason] = useState('');
  const [size, setSize] = useState('');
  const [version, setVersion] = useState('');
  const [flock, setFlock] = useState({ source: 'Keine', name: '', number: '' });

  const clubs = useQuery({ queryKey: ['kitClubs'], queryFn: db.loadKitClubs, staleTime: 10 * 60_000 });
  const kits = useQuery({ queryKey: ['clubKits', club], queryFn: () => db.loadClubKits(club), enabled: !!club });
  const pickerClubs = useMemo(() => (clubs.data ?? []).map((c) => ({ id: c.id, name: c.name, league: c.league, aliases: c.aliases ?? [] })).sort((a, b) => a.name.localeCompare(b.name)), [clubs.data]);
  const c = clubs.data?.find((x) => x.id === club);
  const all = (kits.data ?? []).filter((k) => k.image_path);
  const kinds = KIT_KINDS.filter((k) => all.some((x) => x.kind === k));
  const groups = bySeason(all.filter((k) => (kind === 'all' || k.kind === kind) && (!season.trim() || k.season.includes(season.trim()))));
  const kit = all.find((k) => k.id === kitId);

  const kitName = (k: NonNullable<typeof kit>) => {
    const v = variantLabel(k.variant, t);
    return `${c?.name ?? ''} ${k.season} · ${t('lib.kind.' + k.kind)}${v ? ' · ' + v : ''}`;
  };

  const save = () => {
    if (!kit || !c) return;
    add.mutate(
      quickItem(kit, c.name, size, version, flock, profile?.collectionPrivate),
      {
        onSuccess: (item) => {
          toast(t('qa.saved'));
          navigate('/vault/item/' + item.id);
        }
      }
    );
  };

  return (
    <Page style={{ maxWidth: 960 }}>
      <div className="eyebrow">{t('as.eyebrow')}</div>
      <h1 className="display" style={{ marginTop: 8, fontSize: 'clamp(28px,4vw,44px)' }}>
        {t('qa.title')}
      </h1>
      <p style={{ color: 'var(--text-2)', margin: '8px 0 0', fontSize: 15, lineHeight: 1.5, maxWidth: 640 }}>{t('qa.intro')}</p>
      <p style={{ margin: '6px 0 24px', fontSize: 13.5 }}>
        <Link to="/vault/add">{t('qa.withPhotos')} ›</Link>
      </p>

      <Section title={t('qa.club')}>
        <div style={{ maxWidth: 420 }}>
          <ClubPicker
            id="qa-club"
            clubs={pickerClubs}
            value={club}
            onChange={(id) => {
              setClub(id);
              setKitId('');
              setKind('all');
              setSeason('');
            }}
            label={t('qa.club')}
            placeholder={t('fav.placeholder')}
          />
        </div>
      </Section>

      {club && !kit && (
        <Section title={t('qa.pick', { club: c?.name ?? '' })} hint={t('qa.pickHint')}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
            <div className="field" style={{ width: 150 }}>
              <input aria-label={t('qa.season')} placeholder={t('qa.season')} value={season} onChange={(e) => setSeason(e.target.value)} inputMode="numeric" />
            </div>
            {kinds.length > 1 &&
              ['all', ...kinds].map((k) => (
                <button key={k} type="button" className="option-btn" aria-pressed={kind === k} onClick={() => setKind(k)} style={{ padding: '7px 13px', fontSize: 13 }}>
                  {k === 'all' ? t('lib.allKinds') : t('lib.kind.' + k)}
                </button>
              ))}
          </div>
          {kits.isLoading && <Skeleton height={240} radius={18} />}
          {groups.map((g) => (
            <div key={g.season} style={{ marginBottom: 18 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 750 }}>{g.season}</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,130px),1fr))' }}>
                {g.kits.map((k) => (
                  <li key={k.id}>
                    <button type="button" className="card card--interactive" onClick={() => setKitId(k.id)} aria-label={t('qa.choose', { name: kitName(k) })} style={{ width: '100%', padding: 8, borderRadius: 16, border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', font: 'inherit', color: 'var(--text)' }}>
                      <span style={{ display: 'grid', placeItems: 'center', aspectRatio: '1/1', borderRadius: 12, background: 'var(--kit-tile)', overflow: 'hidden' }}>
                        <img src={k.image_path!} alt="" loading="lazy" decoding="async" style={{ width: '86%', height: '86%', objectFit: 'contain' }} />
                      </span>
                      <span style={{ display: 'block', fontSize: 12.5, fontWeight: 650, marginTop: 6 }}>
                        {t('lib.kind.' + k.kind)}
                        {k.variant && <span style={{ fontWeight: 400, color: 'var(--muted)' }}> · {variantLabel(k.variant, t)}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {kits.data && !groups.length && <p style={{ color: 'var(--muted)', fontSize: 14 }}>{t('qa.none')}</p>}
        </Section>
      )}

      {kit && (
        <>
          <Card style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
            <span style={{ width: 110, height: 110, borderRadius: 16, background: 'var(--kit-tile)', display: 'grid', placeItems: 'center', flex: 'none', overflow: 'hidden' }}>
              <img src={kit.image_path!} alt="" style={{ width: '88%', height: '88%', objectFit: 'contain' }} />
            </span>
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{kitName(kit)}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>📷 {t('vault.photosPending')}</div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setKitId('')}>
              {t('qa.other')}
            </Button>
          </Card>

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
              {VERSIONS.filter((v: string) => v !== 'Unbekannt').map((v: string) => (
                <Pill key={v} active={version === v} onClick={() => setVersion(version === v ? '' : v)}>
                  {label('opt', v)}
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
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 110px', gap: 10, maxWidth: 420 }}>
                <TextField label={t('qa.flockName')} value={flock.name} onChange={(e) => setFlock({ ...flock, name: e.target.value.slice(0, 30) })} />
                <TextField label={t('qa.flockNumber')} inputMode="numeric" value={flock.number} onChange={(e) => setFlock({ ...flock, number: e.target.value.replace(/[^0-9]/g, '').slice(0, 3) })} />
              </div>
            )}
          </Section>

          <Button onClick={save} busy={add.isPending} disabled={add.isPending}>
            {t('qa.save')}
          </Button>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '10px 0 0', lineHeight: 1.5, maxWidth: 560 }}>{t('qa.later')}</p>
        </>
      )}
    </Page>
  );
}
