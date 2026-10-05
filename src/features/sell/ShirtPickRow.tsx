import type { ReactNode } from 'react';
import type { Shirt } from '../../data.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { ShirtGraphic } from '../../ui/index.ts';

export function ShirtPickRow({ s, onPick, right }: { s: Shirt; onPick: (s: Shirt) => void; right?: ReactNode }) {
  const { money, label } = usePrefs();
  return (
    <button type="button" className="row-btn" onClick={() => onPick(s)}>
      <span style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--bg)', display: 'grid', placeItems: 'center', flex: 'none' }}>
        <ShirtGraphic pat={s.pat} trim={s.trim} crest={s.crest} flat style={{ width: '80%' }} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
        <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>
          {s.brand} · {label('league', s.league)}
        </span>
      </span>
      {right ?? (
        <span className="mono" style={{ fontSize: 13, color: 'var(--text-2)' }}>
          {money(s.price)}
        </span>
      )}
    </button>
  );
}

export function SelectedShirt({ s, onChange }: { s: Shirt; onChange: () => void }) {
  const { money, t, label } = usePrefs();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18, background: 'var(--surface)', border: '1px solid var(--line)' }}>
      <span style={{ width: 56, height: 56, borderRadius: 12, background: 'var(--bg)', display: 'grid', placeItems: 'center', flex: 'none' }}>
        <ShirtGraphic pat={s.pat} trim={s.trim} crest={s.crest} flat style={{ width: '80%' }} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 600 }}>{s.name}</span>
        <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
          {t('sell.pickMeta', { brand: s.brand, league: label('league', s.league), price: money(s.price) })}
        </span>
      </span>
      <button type="button" className="btn btn--ghost btn--sm" onClick={onChange} style={{ height: 36 }}>
        {t('sell.change')}
      </button>
    </div>
  );
}
