import { BY } from '../../../data.ts';
import { usePrefs } from '../../../lib/prefs.tsx';
import { Button, Card, SearchField } from '../../../ui/index.ts';
import { search } from '../../catalog/model.ts';
import { ShirtPickRow } from '../../sell/ShirtPickRow.tsx';
import { Section } from './parts.tsx';
import { inputStyle } from './styles.ts';
import type { Wizard } from './useAddShirtForm.ts';
import { useDeferredValue } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import * as db from '../../../utils/db.ts';
import { parseKitQuery } from '../../home/kitQuery.ts';
import { KIND_WORD, variantLabel } from '../../library/model.ts';

export function IdentifyStep({ w }: { w: Wizard }) {
  const { f, set } = w;
  const { t, label } = usePrefs();
  const catalogItem = f.catalogId ? BY[f.catalogId] : undefined;
  const matches = f.searchQ.trim() && !f.catalogId && !f.kitId ? search(f.searchQ).slice(0, 6) : [];
  // Every kit of the library too, with its picture.
  const kq = parseKitQuery(useDeferredValue(f.searchQ));
  const kits = useQuery({ queryKey: ['librarySearch', kq], queryFn: () => db.searchLibrary(kq), enabled: kq.club.length >= 2 && !f.kitId, staleTime: 5 * 60_000, retry: false });
  const kitName = (k: db.KitHit) => `${k.club_name} ${k.season} · ${t('lib.kind.' + k.kind)}${k.variant ? ' · ' + variantLabel(k.variant, t) : ''}`;
  return (
    <div>
      <Section title={t('as.id.title')} hint={t('as.id.hint')}>
        <SearchField srLabel={t('as.id.searchLabel')} value={f.searchQ} onChange={(e) => set({ searchQ: e.target.value, catalogId: null, proposed: false, kitId: null })} placeholder={t('as.id.placeholder')} />
        {matches.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {matches.map((s) => (
              <ShirtPickRow key={s.id} s={s} onPick={() => set({ catalogId: s.id, proposed: false, kitId: null, searchQ: s.name })} />
            ))}
          </div>
        )}
        {!f.kitId && !f.catalogId && (kits.data ?? []).length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div className="mono" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', margin: '0 4px 6px' }}>
              {t('home.find.library')}
            </div>
            {kits.data!.map((k) => (
              <button
                key={k.id}
                type="button"
                className="row-btn"
                onClick={() => set({ kitId: k.id, catalogId: null, proposed: true, proposedClub: k.club_name, proposedSeason: k.season, proposedVariant: [KIND_WORD[k.kind] ?? '', k.variant].filter(Boolean).join(' '), searchQ: kitName(k) })}
                style={{ width: '100%', textAlign: 'left' }}
              >
                <span style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--sunken)', display: 'grid', placeItems: 'center', overflow: 'hidden', flex: 'none' }}>
                  {k.image_path && <img src={k.image_path} alt="" loading="lazy" style={{ width: '88%', height: '88%', objectFit: 'contain' }} />}
                </span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600 }}>{kitName(k)}</span>
              </button>
            ))}
          </div>
        )}
        <p style={{ margin: '12px 0 0', fontSize: 13 }}>
          <Link to="/vault/add/library">{t('qa.entry')} ›</Link>
        </p>
      </Section>
      {catalogItem ? (
        <Card tight accent style={{ marginBottom: 20 }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 4 }}>
            {t('as.id.fromCatalogue')}
          </div>
          <div style={{ fontWeight: 600 }}>{catalogItem.name}</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
            {t('as.id.kit', { brand: catalogItem.brand, league: label('league', catalogItem.league), season: catalogItem.season })}
          </div>
        </Card>
      ) : f.kitId ? (
        <Card tight accent style={{ marginBottom: 20 }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 4 }}>
            {t('as.id.fromLibrary')}
          </div>
          <div style={{ fontWeight: 600 }}>{f.searchQ}</div>
          <button type="button" className="link-btn" style={{ fontSize: 12.5, marginTop: 6 }} onClick={() => set({ kitId: null, proposed: false, proposedClub: '', proposedSeason: '', proposedVariant: '', searchQ: '' })}>
            {t('qa.other')}
          </button>
        </Card>
      ) : (
        <Button variant="ghost" block onClick={() => set({ catalogId: null, proposed: true })}>
          {t('as.id.propose')}
        </Button>
      )}
      {f.proposed && !f.kitId && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.4 }}>{t('as.id.proposeNote')}</div>
          <input aria-label={t('as.id.club')} value={f.proposedClub} onChange={(e) => set({ proposedClub: e.target.value })} placeholder={t('as.id.club')} style={inputStyle} />
          <input aria-label={t('as.id.season')} value={f.proposedSeason} onChange={(e) => set({ proposedSeason: e.target.value })} placeholder={t('as.id.seasonPh')} style={inputStyle} />
          <input aria-label={t('as.id.variant')} value={f.proposedVariant} onChange={(e) => set({ proposedVariant: e.target.value })} placeholder={t('as.id.variantPh')} style={inputStyle} />
        </div>
      )}
    </div>
  );
}
