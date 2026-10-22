// /library/:club — one club's kits, season by season, every kind (home,
// away, third, goalkeeper, cup, European, training, special). Kits that are
// in the catalogue link to the market.
import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { BY } from '../../data.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import * as db from '../../utils/db.ts';
import { BookmarkIcon, Button, ErrorState, Page, ShirtGraphic, Skeleton } from '../../ui/index.ts';
import { useCatalog } from '../catalog/useCatalog.ts';
import { ClubBand } from './ClubBand.tsx';
import { KIT_KINDS, bySeason, kitLook, variantLabel } from './model.ts';
import { SuggestKitDialog } from './SuggestKitDialog.tsx';
import { KitOwners } from './KitOwners.tsx';
import { AddKitDialog } from '../vault/AddKitDialog.tsx';
import { WishKitDialog } from '../watchlist/WishKitDialog.tsx';
import { printLabel } from '../watchlist/printLabel.ts';
import { useKitLikes } from '../watchlist/useKitLikes.ts';

export default function ClubLibraryPage() {
  useCatalog();
  const { club = '' } = useParams();
  const { t } = usePrefs();
  const { user } = useSession();
  const clubs = useQuery({ queryKey: ['kitClubs'], queryFn: db.loadKitClubs, staleTime: 10 * 60_000 });
  const kits = useQuery({ queryKey: ['clubKits', club], queryFn: () => db.loadClubKits(club) });
  // Who has which kit in their collection (shown collections only).
  const owners = useQuery({ queryKey: ['kitOwners', club], queryFn: () => db.loadKitOwners(club), staleTime: 60_000, retry: false });
  const { hash } = useLocation();
  // Coming from a search hit ("#season-2006/07"): jump to that season once the kits are there.
  useEffect(() => {
    if (kits.data && hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: 'start' });
  }, [kits.data, hash]);
  const [kind, setKind] = useState<string>('all');
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [suggest, setSuggest] = useState(false);
  // ?add=<kit> (back from signing in) opens the pop-up for that kit.
  const [params, setParams] = useSearchParams();
  const [adding, setAdding] = useState<db.Kit | null>(null);
  const [wishing, setWishing] = useState<db.Kit | null>(null);
  const likes = useKitLikes();
  const askedAdd = params.get('add');
  const [openedAdd, setOpenedAdd] = useState<string | null>(null);
  if (user && askedAdd && askedAdd !== openedAdd && kits.data) {
    setOpenedAdd(askedAdd);
    setAdding(kits.data.find((x) => x.id === askedAdd) ?? null);
  }
  const c = clubs.data?.find((x) => x.id === club);
  // A description of its own: how many kits, from which season to which.
  const seasons = (kits.data ?? []).map((k) => k.season).sort();
  usePageMeta(c ? t('lib.clubMeta', { club: c.name }) : t('lib.meta'), c && seasons.length ? t('lib.clubMetaDesc', { club: c.name, n: seasons.length, from: seasons[0]!, to: seasons.at(-1)! }) : undefined);

  if (clubs.data && !c) return <Navigate to="/library" replace />;
  const all = kits.data ?? [];
  const kinds = KIT_KINDS.filter((k) => all.some((x) => x.kind === k));
  const ownersOf = new Map<string, db.KitOwner[]>();
  for (const o of owners.data ?? []) ownersOf.set(o.kit_id, [...(ownersOf.get(o.kit_id) ?? []), o]);
  const groups = bySeason(all.filter((x) => (kind === 'all' || x.kind === kind) && (!ownedOnly || ownersOf.has(x.id))));

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
        {ownersOf.size > 0 && (
          <button type="button" className="option-btn" aria-pressed={ownedOnly} onClick={() => setOwnedOnly((v) => !v)} style={{ padding: '7px 13px', fontSize: 13 }}>
            👤 {t('lib.withOwners', { n: ownersOf.size })}
          </button>
        )}
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
          <h2 id={'season-' + g.season} className="title" style={{ margin: '0 0 12px', scrollMarginTop: 96 }}>
            {g.season}
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,170px),1fr))' }}>
            {g.kits.map((k) => {
              const s = k.catalog_id ? BY[k.catalog_id] : undefined;
              const look = s ? { pat: s.pat, trim: s.trim, crest: s.crest, photo: s.photo } : kitLook(k.pattern, k.colors);
              const variant = variantLabel(k.variant, t);
              const title = `${c?.name ?? ''} ${k.season} ${t('lib.kind.' + k.kind)}${variant ? ' · ' + variant : ''}`;
              return (
                <li key={k.id} className="card" style={{ padding: 12, borderRadius: 18, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ aspectRatio: '1/1', borderRadius: 14, background: 'var(--kit-tile)', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
                    {k.image_path ? (
                      <img src={k.image_path} alt={title} loading="lazy" decoding="async" style={{ width: '88%', height: '88%', objectFit: 'contain' }} />
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
                  {likes.get(k.id) && printLabel(likes.get(k.id)!) && (
                    <div style={{ fontSize: 12.5, color: 'var(--accent)', fontWeight: 650, marginTop: 4 }}>
                      {t('wishkit.wanted', { print: printLabel(likes.get(k.id)!) })}
                    </div>
                  )}
                  {k.note && <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.4 }}>{k.note}</div>}
                  {/* Offers for this kit from every seller: the catalogue shirt when there is one, else a market search. */}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8, fontSize: 12.5 }}>
                    {s ? (
                      <Link to={'/shirt/' + s.id}>{t('lib.toMarket')}</Link>
                    ) : (
                      <Link to={'/market?q=' + encodeURIComponent(`${c?.name ?? ''} ${k.season}`.trim())} aria-label={t('lib.searchMarketFor', { name: title })}>
                        {t('lib.searchMarket')} ›
                      </Link>
                    )}
                  </div>
                  {k.image_path && (
                    <div style={{ marginTop: 'auto', paddingTop: 10, display: 'flex', gap: 6 }}>
                      {/* On the wishlist (with the print wanted), next to: I have it. */}
                      <button type="button" className={'btn btn--sm ' + (likes.has(k.id) ? 'btn--secondary' : 'btn--ghost')} aria-pressed={likes.has(k.id)} aria-label={(likes.has(k.id) ? t('wish.on') : t('wish.add')) + ' · ' + title} title={likes.has(k.id) ? t('wish.on') : t('wish.add')} onClick={() => setWishing(k)} style={{ flex: 'none', width: 36, height: 36, padding: 0, justifyContent: 'center', color: likes.has(k.id) ? 'var(--accent)' : undefined }}>
                        <BookmarkIcon size={16} filled={likes.has(k.id)} />
                      </button>
                      {user ? (
                        <button type="button" className="btn btn--secondary btn--sm kit-add-btn" onClick={() => setAdding(k)} style={{ flex: 1, minWidth: 0 }} aria-label={t('lib.addToCollectionFor', { name: title })}>
                          + {t('lib.addShort')}
                        </button>
                      ) : (
                        <Link to="/signin" state={{ from: `/library/${club}?add=${k.id}`, notice: 'lib.signInToAdd' }} className="btn btn--secondary btn--sm kit-add-btn" style={{ flex: 1, minWidth: 0 }} aria-label={t('lib.addToCollectionFor', { name: title })}>
                          + {t('lib.addShort')}
                        </Link>
                      )}
                    </div>
                  )}
                  {ownersOf.has(k.id) && <KitOwners owners={ownersOf.get(k.id)!} kitId={k.id} />}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {wishing && c && <WishKitDialog kit={{ id: wishing.id, club_id: c.id, club_name: c.name, league: c.league, season: wishing.season, season_year: wishing.season_year, kind: wishing.kind, variant: wishing.variant, image_path: wishing.image_path ?? null }} onClose={() => setWishing(null)} />}
      {suggest && c && <SuggestKitDialog club={c} onClose={() => setSuggest(false)} />}
      {adding && c && (
        <AddKitDialog
          kit={adding}
          clubName={c.name}
          onClose={() => {
            setAdding(null);
            if (params.has('add')) setParams({}, { replace: true });
          }}
        />
      )}
    </Page>
  );
}
