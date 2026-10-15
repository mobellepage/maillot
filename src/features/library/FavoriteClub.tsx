// The member's favourite team: every kit of it in small round pictures —
// the ones in their collection lit up with a golden ring, the others
// greyed out. A collector's checklist; each kit opens in the library.
import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import { Button } from '../../ui/index.ts';
import { ClubPicker } from '../daily/ClubPicker.tsx';
import { ClubBand } from './ClubBand.tsx';
import { KIT_KINDS, variantLabel } from './model.ts';

/** Shown before "show all" (about three rows on a phone). */
const FIRST = 24;
const GOLD = '#D4A72C';

export function FavoriteClub() {
  const { t } = usePrefs();
  const { user, profile } = useSession();
  const qc = useQueryClient();
  const toast = useToast();
  const fav = profile?.interests.club;
  const [editing, setEditing] = useState(false);
  const [all, setAll] = useState(false);
  const clubs = useQuery({ queryKey: ['kitClubs'], queryFn: db.loadKitClubs, staleTime: 10 * 60_000 });
  const kits = useQuery({ queryKey: ['clubKits', fav], queryFn: () => db.loadClubKits(fav!), enabled: !!fav });
  const mine = useQuery({ queryKey: ['myClubKits', fav, user?.id], queryFn: () => db.loadMyClubKits(fav!), enabled: !!fav && !!user });
  const save = useMutation({
    mutationFn: (id: string) => db.setFavoriteClub(id),
    onSuccess: async () => {
      setEditing(false);
      setAll(false);
      await qc.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
    onError: () => toast(t('toast.actionFailed'))
  });
  if (!user || profile === undefined) return null;

  const club = clubs.data?.find((c) => c.id === fav);
  const pickerClubs = (clubs.data ?? []).map((c) => ({ id: c.id, name: c.name, league: c.league, aliases: c.aliases ?? [] })).sort((a, b) => a.name.localeCompare(b.name));

  if (!fav || editing || (clubs.data && !club))
    return (
      <section aria-labelledby="fav-title" className="card" style={{ padding: 'clamp(18px,2.4vw,26px)', borderRadius: 24 }}>
        <h2 id="fav-title" style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>
          ⭐ {t('fav.title')}
        </h2>
        <p style={{ margin: '4px 0 14px', color: 'var(--text-2)', fontSize: 14.5, lineHeight: 1.45 }}>{t('fav.body')}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 260px', maxWidth: 420 }}>
            <ClubPicker id="fav-club" clubs={pickerClubs} value="" onChange={(id) => id && save.mutate(id)} label={t('fav.pick')} placeholder={t('fav.placeholder')} />
          </div>
          {editing && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              {t('common.cancel')}
            </Button>
          )}
        </div>
      </section>
    );

  const order = (k: string) => (KIT_KINDS as readonly string[]).indexOf(k);
  const list = [...(kits.data ?? [])].sort((a, b) => b.season_year - a.season_year || b.season.localeCompare(a.season) || order(a.kind) - order(b.kind) || a.variant.localeCompare(b.variant));
  const owned = new Set((mine.data ?? []).map((m) => m.kit_id));
  const have = list.filter((k) => owned.has(k.id)).length;
  // Owned kits always show, even when the list is folded.
  const shown = all ? list : list.filter((k, i) => i < FIRST || owned.has(k.id));

  return (
    <section aria-labelledby="fav-title" className="card" style={{ padding: 'clamp(18px,2.4vw,26px)', borderRadius: 24 }}>
      {club && <ClubBand colors={club.colors} height={6} />}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
        <h2 id="fav-title" style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>
          ⭐ {club?.name ?? '…'}
        </h2>
        <span style={{ fontSize: 14, color: 'var(--text-2)' }}>{kits.data ? t('fav.progress', { have, total: list.length }) : ''}</span>
        <span style={{ flex: 1 }} />
        <button type="button" className="link-btn" style={{ fontSize: 13 }} onClick={() => setEditing(true)}>
          {t('fav.change')}
        </button>
      </div>
      {kits.data && (
        <div role="progressbar" aria-label={t('fav.progressLabel')} aria-valuemin={0} aria-valuemax={list.length} aria-valuenow={have} style={{ height: 6, borderRadius: 6, background: 'var(--sunken)', marginTop: 10, overflow: 'hidden' }}>
          <div style={{ width: (list.length ? (have / list.length) * 100 : 0) + '%', height: '100%', background: GOLD, borderRadius: 6 }} />
        </div>
      )}
      <ul aria-label={t('fav.kits', { club: club?.name ?? '' })} style={{ listStyle: 'none', padding: 0, margin: '14px 0 0', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {shown.map((k) => {
          const has = owned.has(k.id);
          const variant = variantLabel(k.variant, t);
          const label = `${k.season} · ${t('lib.kind.' + k.kind)}${variant ? ' · ' + variant : ''} — ${has ? t('fav.have') : t('fav.missing')}`;
          return (
            <li key={k.id}>
              <Link
                to={'/library/' + k.club_id + '#season-' + k.season}
                title={label}
                aria-label={label}
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: has ? 'radial-gradient(circle,#FFF8E1,#F4E3B0)' : 'var(--sunken)',
                  border: has ? `3px solid ${GOLD}` : '1px solid var(--line)',
                  boxShadow: has ? `0 0 0 3px rgba(212,167,44,0.25), 0 0 18px rgba(255,196,40,0.55)` : 'none'
                }}
              >
                {k.image_path ? (
                  <img src={k.image_path} alt="" loading="lazy" decoding="async" style={{ width: '82%', height: '82%', objectFit: 'contain', filter: has ? 'none' : 'grayscale(1)', opacity: has ? 1 : 0.35 }} />
                ) : (
                  <span aria-hidden="true" style={{ width: '60%', height: '60%', borderRadius: 6, background: k.colors[0] ?? '#ccc', filter: has ? 'none' : 'grayscale(1)', opacity: has ? 1 : 0.35 }} />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      {list.length > shown.length && (
        <button type="button" className="link-btn" style={{ marginTop: 12, fontSize: 13.5, fontWeight: 650 }} onClick={() => setAll(true)}>
          {t('fav.showAll', { n: list.length })}
        </button>
      )}
    </section>
  );
}
