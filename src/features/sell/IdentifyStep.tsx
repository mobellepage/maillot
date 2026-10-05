import { useState } from 'react';
import { BY } from '../../data.ts';
import { Card, Notice, SearchField } from '../../ui/index.ts';
import { search, trendingByMarket } from '../catalog/model.ts';
import { ShirtPickRow } from './ShirtPickRow.tsx';
import type { SellFlow } from './useSellFlow.ts';

export function IdentifyStep({ f }: { f: SellFlow }) {
  const [q, setQ] = useState('');
  const hits = q.trim() ? search(q).slice(0, 8) : [];
  const match = f.scan.status === 'done' && f.scan.matchId ? BY[f.scan.matchId] : undefined;
  const reading = f.scan.status === 'reading';
  const img = f.scan.status !== 'idle' ? f.scan.img : null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      <Card style={{ flex: '1 1 440px', minWidth: 0 }}>
        <h2 className="display display--sm">Which shirt are you selling?</h2>
        <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '8px 0 18px' }}>Search the catalogue by club, season, brand or player.</p>
        <SearchField srLabel="Search the catalogue" placeholder="e.g. Juventus 1996, Maradona, Basel" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        <div style={{ marginTop: 10 }}>
          {hits.map((s) => (
            <ShirtPickRow key={s.id} s={s} onPick={f.pick} />
          ))}
          {q.trim() && !hits.length && <p style={{ padding: '14px 4px', margin: 0, fontSize: 14, color: 'var(--muted)' }}>No catalogue match. Try fewer words — or add it to your collection via “Add shirt” to have it catalogued.</p>}
          {!q.trim() && (
            <>
              <div className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', margin: '12px 4px 4px' }}>
                In demand right now
              </div>
              {trendingByMarket(6).map((s) => (
                <ShirtPickRow key={s.id} s={s} onPick={f.pick} />
              ))}
            </>
          )}
        </div>
      </Card>

      <div style={{ flex: '1 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label
          style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 280, borderRadius: 24, overflow: 'hidden', border: '1.5px dashed rgba(75,255,139,0.45)', background: 'radial-gradient(circle at 50% 40%,rgba(75,255,139,0.08),rgba(0,0,0,0) 60%),var(--sunken)', cursor: reading ? 'progress' : 'pointer', textAlign: 'center', padding: 24 }}
        >
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={reading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) f.scanLabel(file);
            }}
          />
          {img && <span aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundImage: `url("${img}")`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.35 }} />}
          <span style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <span className="badge badge--solid" style={{ letterSpacing: '0.1em', borderRadius: 6 }}>
              LABEL SCAN
            </span>
            <span className="display display--sm">{reading ? 'Reading label…' : 'Or snap the inner label'}</span>
            <span style={{ fontSize: 13.5, color: 'var(--text-2)', maxWidth: 300, lineHeight: 1.5 }}>We read the printed product label on your device (nothing is uploaded) and match it to the catalogue.</span>
            {reading && (
              <span role="progressbar" aria-label="Reading label" style={{ width: 160, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <span style={{ display: 'block', width: '40%', height: '100%', background: 'var(--accent)', animation: 'kvSlide 1.1s ease-in-out infinite' }} />
              </span>
            )}
          </span>
        </label>
        {match && f.scan.status === 'done' && (
          <Card tight accent style={{ animation: 'kvIn .3s ease both' }}>
            <div className="eyebrow" style={{ margin: '0 4px 6px' }}>
              Label match
            </div>
            <ShirtPickRow s={match} onPick={f.pick} right={<span className="badge badge--accent">{Math.round(f.scan.confidence * 100)}%</span>} />
          </Card>
        )}
        {f.scan.status === 'done' && f.scan.message && <Notice tone="warn">{f.scan.message}</Notice>}
      </div>
    </div>
  );
}
