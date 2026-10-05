import { BY } from '../../../data.ts';
import { Button, Card, SearchField } from '../../../ui/index.ts';
import { search } from '../../catalog/model.ts';
import { ShirtPickRow } from '../../sell/ShirtPickRow.tsx';
import { Section } from './parts.tsx';
import { inputStyle } from './styles.ts';
import type { Wizard } from './useAddShirtForm.ts';

export function IdentifyStep({ w }: { w: Wizard }) {
  const { f, set } = w;
  const catalogItem = f.catalogId ? BY[f.catalogId] : undefined;
  const matches = f.searchQ.trim() && !f.catalogId ? search(f.searchQ).slice(0, 6) : [];
  return (
    <div>
      <Section title="Suche nach Verein, Saison oder Variante" hint='z. B. "Juventus 1996" oder "UCL Final 2012"'>
        <SearchField srLabel="Katalog durchsuchen" value={f.searchQ} onChange={(e) => set({ searchQ: e.target.value, catalogId: null, proposed: false })} placeholder="Verein, Nationalmannschaft, Saison …" />
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
            ✓ AUS KATALOG ÜBERNOMMEN
          </div>
          <div style={{ fontWeight: 600 }}>{catalogItem.name}</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
            Ausrüster: {catalogItem.brand} · {catalogItem.league} · {catalogItem.season}
          </div>
        </Card>
      ) : (
        <Button variant="ghost" block onClick={() => set({ catalogId: null, proposed: true })}>
          Kein Treffer? Neues Trikot vorschlagen
        </Button>
      )}
      {f.proposed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.4 }}>Dein Vorschlag wird nach dem Speichern zur Prüfung an unser Katalog-Team gesendet.</div>
          <input aria-label="Verein / Nationalmannschaft" value={f.proposedClub} onChange={(e) => set({ proposedClub: e.target.value })} placeholder="Verein / Nationalmannschaft" style={inputStyle} />
          <input aria-label="Saison" value={f.proposedSeason} onChange={(e) => set({ proposedSeason: e.target.value })} placeholder="Saison, z. B. 2011/12" style={inputStyle} />
          <input aria-label="Variante" value={f.proposedVariant} onChange={(e) => set({ proposedVariant: e.target.value })} placeholder="Variante, z. B. Home / Away / UCL Final 2012" style={inputStyle} />
        </div>
      )}
    </div>
  );
}
