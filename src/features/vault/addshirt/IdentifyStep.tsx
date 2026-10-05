import { BY } from '../../../data.ts';
import { usePrefs } from '../../../lib/prefs.tsx';
import { Button, Card, SearchField } from '../../../ui/index.ts';
import { search } from '../../catalog/model.ts';
import { ShirtPickRow } from '../../sell/ShirtPickRow.tsx';
import { Section } from './parts.tsx';
import { inputStyle } from './styles.ts';
import type { Wizard } from './useAddShirtForm.ts';

export function IdentifyStep({ w }: { w: Wizard }) {
  const { f, set } = w;
  const { t, label } = usePrefs();
  const catalogItem = f.catalogId ? BY[f.catalogId] : undefined;
  const matches = f.searchQ.trim() && !f.catalogId ? search(f.searchQ).slice(0, 6) : [];
  return (
    <div>
      <Section title={t('as.id.title')} hint={t('as.id.hint')}>
        <SearchField srLabel={t('as.id.searchLabel')} value={f.searchQ} onChange={(e) => set({ searchQ: e.target.value, catalogId: null, proposed: false })} placeholder={t('as.id.placeholder')} />
        {matches.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {matches.map((s) => (
              <ShirtPickRow key={s.id} s={s} onPick={() => set({ catalogId: s.id, proposed: false, searchQ: s.name })} />
            ))}
          </div>
        )}
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
      ) : (
        <Button variant="ghost" block onClick={() => set({ catalogId: null, proposed: true })}>
          {t('as.id.propose')}
        </Button>
      )}
      {f.proposed && (
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
