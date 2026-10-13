// Collector level: a small badge (profiles) and the card with progress to
// the next level and every level's threshold (own collection).
import { useEffect, useState } from 'react';
import { COLLECTOR_LEVELS } from '../../config/rules.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useToast } from '../../lib/toast.tsx';
import { loadJSON, saveJSON } from '../../utils/storage.ts';
import { levelFor, type Level } from './levels.ts';

function Emblem({ level, rank, size = 22 }: { level: Level | null; rank: number; size?: number }) {
  const color = level?.color ?? '#B8BDB9';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flex: 'none' }}>
      <path d="M12 1.8L20.5 5.4V11.6C20.5 16.6 16.9 20.6 12 22.2C7.1 20.6 3.5 16.6 3.5 11.6V5.4Z" fill={color} />
      <text x="12" y="15.6" textAnchor="middle" fontSize="10" fontWeight="800" fill="#FFFFFF" fontFamily="var(--font-sans)">
        {rank}
      </text>
    </svg>
  );
}

export function LevelBadge({ shirts, value }: { shirts: number; value: number }) {
  const { t } = usePrefs();
  const s = levelFor(shirts, value);
  if (!s.level) return null;
  return (
    <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontSize: 12, background: 'var(--sunken)', border: '1px solid var(--line)', color: 'var(--text)' }}>
      <Emblem level={s.level} rank={s.rank} size={16} />
      {t('level.' + s.level.key)}
    </span>
  );
}

const SEEN_KEY = 'kv_level_seen';

export function LevelCard({ shirts, value }: { shirts: number; value: number }) {
  const { t, money } = usePrefs();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const s = levelFor(shirts, value);

  // Celebrate a new level once (per device).
  useEffect(() => {
    const seen = loadJSON<number>(SEEN_KEY, -1);
    if (seen >= 0 && s.rank > seen && s.level) toast(t('level.up', { level: t('level.' + s.level.key) }));
    if (seen !== s.rank) saveJSON(SEEN_KEY, s.rank);
  }, [s.rank, s.level, toast, t]);

  return (
    <section aria-labelledby="level-title" className="card" style={{ padding: 18, borderRadius: 18, marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <Emblem level={s.level} rank={s.rank} size={44} />
        <div style={{ flex: '1 1 220px', minWidth: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('level.eyebrow')}</div>
          <h2 id="level-title" style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 800 }}>
            {s.level ? t('level.' + s.level.key) : t('level.none')}
          </h2>
        </div>
        <button type="button" className="link-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)} style={{ fontSize: 13 }}>
          {open ? t('level.hideAll') : t('level.showAll')}
        </button>
      </div>
      {s.next ? (
        <>
          <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(s.progress * 100)} aria-label={t('level.progress', { level: t('level.' + s.next.key) })} style={{ height: 8, borderRadius: 8, background: 'var(--sunken)', overflow: 'hidden', marginTop: 14 }}>
            <div style={{ height: '100%', width: s.progress * 100 + '%', background: 'var(--accent-fill)', transition: 'width .4s' }} />
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '8px 0 0' }}>
            {s.next.value ? t('level.toGo', { n: s.shirtsToGo, value: money(s.valueToGo), level: t('level.' + s.next.key) }) : t('level.toGoShirts', { n: s.shirtsToGo, level: t('level.' + s.next.key) })}
          </p>
        </>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '10px 0 0' }}>{t('level.top')}</p>
      )}
      {open && (
        <ol style={{ listStyle: 'none', padding: 0, margin: '16px 0 0', display: 'grid', gap: 8 }}>
          {COLLECTOR_LEVELS.map((l, i) => (
            <li key={l.key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, opacity: i < s.rank ? 1 : 0.7 }}>
              <Emblem level={l} rank={i + 1} size={22} />
              <strong style={{ minWidth: 110 }}>{t('level.' + l.key)}</strong>
              <span style={{ color: 'var(--text-2)' }}>{l.value ? t('level.rule', { n: l.shirts, value: money(l.value) }) : t('level.ruleFirst')}</span>
              {i < s.rank && <span aria-label={t('level.reached')} style={{ color: 'var(--accent)', fontWeight: 700 }}>✓</span>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
