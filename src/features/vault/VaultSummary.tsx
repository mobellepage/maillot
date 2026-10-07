import { useQuery } from '@tanstack/react-query';
import { pct } from '../../data.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import type { CustomItem } from '../../types/domain.ts';
import * as db from '../../utils/db.ts';
import { Card } from '../../ui/index.ts';
import { itemName, valueOf } from './model.ts';
import { weeklyMoves } from './moves.ts';

export function VaultSummary({ items, watching }: { items: CustomItem[]; watching: number }) {
  const { money, t } = usePrefs();
  const now = items.reduce((a, c) => a + (valueOf(c) ?? 0), 0);
  const added = items.reduce((a, c) => a + (c.initialValuation && !c.initialValuation.blocked ? c.initialValuation.mid : valueOf(c) ?? 0), 0);
  const up = now >= added;
  const count = (pred: (c: CustomItem) => boolean) => items.filter(pred).length;
  const inReview = (c: CustomItem) => c.verification.level !== 'expert' && ['angefragt', 'in Prüfung'].includes(c.verification.status);
  const tiers: [string, number, string][] = [
    [t('badge.expert'), count((c) => c.verification.level === 'expert'), 'var(--warn)'],
    [t('badge.precheck'), count((c) => c.verification.level === 'precheck'), 'var(--info)'],
    [t('vault.inReview'), count(inReview), 'var(--text-2)'],
    [t('badge.self'), count((c) => c.verification.level === 'self' && !inReview(c)), 'var(--muted)']
  ];
  const total = Math.max(1, items.length);
  // Like a portfolio: how the collection moved this week, and what moved most.
  const ids = [...new Set(items.map((c) => c.catalogId).filter((x): x is string => !!x))].sort();
  const history = useQuery({ queryKey: ['valueHistory', ids], queryFn: () => db.loadValueHistory(ids), enabled: ids.length > 0, staleTime: 30 * 60 * 1000 });
  const week = history.data ? weeklyMoves(items.map((c) => ({ id: c.id, catalogId: c.catalogId, name: itemName(c), value: valueOf(c) })), history.data) : null;
  const signed = (n: number) => (n >= 0 ? '+' : '−') + money(Math.abs(n));

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 32 }}>
      <Card style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div className="mono" style={{ fontSize: 11.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            {t('vault.value')}
          </div>
          <div className="mono" style={{ fontSize: 'clamp(36px,4vw,48px)', fontWeight: 700, marginTop: 8 }}>
            {money(now)}
          </div>
          <div className="mono" style={{ fontSize: 15, color: up ? 'var(--accent)' : 'var(--neg)', marginTop: 6 }}>
            {t('vault.sinceAdded', { amount: (up ? '+' : '−') + money(Math.abs(now - added)), pct: pct(added ? ((now - added) / added) * 100 : 0) })}
          </div>
          {week && Math.abs(week.change) >= 1 && (
            <div className="mono" style={{ fontSize: 15, color: week.change >= 0 ? 'var(--accent)' : 'var(--neg)', marginTop: 4 }}>
              {t('vault.thisWeek', { amount: signed(week.change), pct: pct(week.pct) })}
            </div>
          )}
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{t('vault.estimateNote')}</div>
        </div>
        {week && week.movers.length > 0 && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{t('vault.movers')}</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
              {week.movers.map((m) => (
                <li key={m.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13.5 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                  <span className="mono" style={{ color: m.pct >= 0 ? 'var(--accent)' : 'var(--neg)', flex: 'none' }}>
                    {pct(m.pct)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div className="tile">
            <div className="mono" style={{ fontSize: 20, fontWeight: 700 }}>
              {items.length}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('vault.shirts')}</div>
          </div>
          <div className="tile">
            <div className="mono" style={{ fontSize: 20, fontWeight: 700 }}>
              {watching}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('vault.watching')}</div>
          </div>
        </div>
      </Card>
      <Card style={{ flex: '2 1 520px', minWidth: 0 }}>
        <h2 className="title" style={{ margin: 0 }}>
          {t('vault.verification')}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>{t('vault.verificationBody')}</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tiers.map(([label, n, color]) => (
            <li key={label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 6 }}>
                <span style={{ color: 'var(--text-2)' }}>{label}</span>
                <span className="mono" style={{ color }}>
                  {n}
                </span>
              </div>
              <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={n} style={{ height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{ width: (n / total) * 100 + '%', height: '100%', background: color, borderRadius: 6, transition: 'width .4s' }} />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
