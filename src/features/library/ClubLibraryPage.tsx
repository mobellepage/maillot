// /library/:club — one club's kits, season by season, every kind (home,
// away, third, goalkeeper, cup, European, training, special). Kits that are
// in the catalogue link to the market.
import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { BY } from '../../data.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import * as db from '../../utils/db.ts';
import { Button, ErrorState, Page, ShirtGraphic, Skeleton } from '../../ui/index.ts';
import { useCatalog } from '../catalog/useCatalog.ts';
import { ClubBand } from './ClubBand.tsx';
import { KIT_KINDS, bySeason, kitLook, variantLabel } from './model.ts';
import { SuggestKitDialog } from './SuggestKitDialog.tsx';

export default function ClubLibraryPage() {
  useCatalog();
  const { club = '' } = useParams();
  const { t } = usePrefs();
  const { user } = useSession();
  const clubs = useQuery({ queryKey: ['kitClubs'], queryFn: db.loadKitClubs, staleTime: 10 * 60_000 });
  const kits = useQuery({ queryKey: ['clubKits', club], queryFn: () => db.loadClubKits(club) });
  const [kind, setKind] = useState<string>('all');
  const [suggest, setSuggest] = useState(false);
  const c = clubs.data?.find((x) => x.id === club);
  usePageMeta(c ? t('lib.clubMeta', { club: c.name }) : t('lib.meta'));

  if (clubs.data && !c) return <Navigate to="/library" replace />;
  const all = kits.data ?? [];
  const kinds = KIT_KINDS.filter((k) => all.some((x) => x.kind === k));
  const groups = bySeason(kind === 'all' ? all : all.filter((x) => x.kind === kind));

  return (
    <Page>
      <Link to="/library" className="btn btn--ghost btn--sm" style={{ marginBottom: 16 }}>
        {t('lib.back')}
      </Link>
      {c ? (
        <>
          <ClubBand colors={c.colors} height={12} />
          <h1 className="display" style={{ fontSize: 'clamp(30px,5vw,48px)', margin: '14px 0 0' }}>
            {c.name}
          </h1>
          <p style={{ color: 'var(--muted)', margin: '6px 0 0', fontSize: 14 }}>
            {c.league} · {c.country} · {t('lib.kitCount', { n: all.length })}
          </p>
        </>
      ) : (
        <Skeleton height={90} radius={16} />
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 20 }}>
        {kinds.length > 1 &&
          ['all', ...kinds].map((k) => (
            <button key={k} type="button" className="option-btn" aria-pressed={kind === k} onClick={() => setKind(k)} style={{ padding: '7px 13px', fontSize: 13 }}>
              {k === 'all' ? t('lib.allKinds') : t('lib.kind.' + k)}
            </button>
          ))}
        <span style={{ flex: 1 }} />
        {user ? (
          <Button size="sm" variant="secondary" onClick={() => setSuggest(true)}>
            {t('lib.suggest')}
          </Button>
        ) : (
          <Link to={'/signin?next=/library/' + club} className="btn btn--secondary btn--sm">
            {t('lib.suggestSignIn')}
          </Link>
        )}
      </div>

      {kits.isLoading && <Skeleton height={260} radius={20} style={{ marginTop: 20 }} />}
      {kits.isError && <ErrorState what={t('lib.title')} onRetry={() => kits.refetch()} />}
      {kits.data && !all.length && (
        <div className="card" style={{ padding: 22, borderRadius: 18, marginTop: 20 }}>
          <div style={{ fontWeight: 700 }}>{t('lib.emptyTitle')}</div>
          <p style={{ margin: '6px 0 0', color: 'var(--text-2)', fontSize: 14, lineHeight: 1.5 }}>{t('lib.emptyBody')}</p>
        </div>
      )}

      {groups.map((g) => (
        <section key={g.season} aria-labelledby={'season-' + g.season} style={{ marginTop: 28 }}>
          <h2 id={'season-' + g.season} className="title" style={{ margin: '0 0 12px' }}>
            {g.season}
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,170px),1fr))' }}>
            {g.kits.map((k) => {
              const s = k.catalog_id ? BY[k.catalog_id] : undefined;
              const look = s ? { pat: s.pat, trim: s.trim, crest: s.crest, photo: s.photo } : kitLook(k.pattern, k.colors);
              const variant = variantLabel(k.variant, t);
              const title = `${c?.name ?? ''} ${k.season} ${t('lib.kind.' + k.kind)}${variant ? ' · ' + variant : ''}`;
              return (
                <li key={k.id} className="card" style={{ padding: 12, borderRadius: 18 }}>
                  <div style={{ aspectRatio: '1/1', borderRadius: 14, background: 'var(--sunken)', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
                    {k.image_path ? (
                      <img src={k.image_path} alt={title} loading="lazy" decoding="async" style={{ width: '88%', height: '88%', objectFit: 'contain', borderRadius: 10 }} />
                    ) : (
                      <ShirtGraphic {...look} flat style={{ width: '76%' }} title={title} />
                    )}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 10 }}>
                    {t('lib.kind.' + k.kind)}
                    {variant && <span style={{ fontWeight: 500, color: 'var(--text-2)' }}> · {variant}</span>}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{[k.brand, k.sponsor].filter(Boolean).join(' · ') || (k.image_credit ? '' : '—')}</div>
                  {k.image_credit && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                      {/* Credited as plain text: no link that leads people away from Maillot. */}
                      {t('lib.credit')} {k.image_credit}
                    </div>
                  )}
                  {k.note && <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.4 }}>{k.note}</div>}
                  {s && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8, fontSize: 12.5 }}>
                      <Link to={'/shirt/' + s.id}>{t('lib.toMarket')}</Link>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {suggest && c && <SuggestKitDialog club={c} onClose={() => setSuggest(false)} />}
    </Page>
  );
}
