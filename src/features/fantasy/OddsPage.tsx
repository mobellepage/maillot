// Pack odds, in the open: the chance of each rarity per card, how many kits
// each rarity holds, what a duplicate is worth — and the rules that keep the
// game free (no packs or points for money, no cashing out).
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { FANTASY } from '../../config/fantasy.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import * as db from '../../utils/db.ts';
import { Page, Skeleton } from '../../ui/index.ts';
import { RARITY_COLOR, isRarity } from './model.ts';

export default function OddsPage() {
  const { t } = usePrefs();
  usePageMeta(t('fantasy.odds.title') + ' · Fantasy', t('fantasy.odds.body'));
  const odds = useQuery({ queryKey: ['fantasyOdds'], queryFn: db.loadFantasyOdds, staleTime: 60 * 60_000, retry: false });
  return (
    <Page narrow>
      <Link to="/fantasy" className="btn btn--ghost btn--sm" style={{ marginBottom: 16 }}>
        ← Fantasy
      </Link>
      <h1 className="display" style={{ fontSize: 'clamp(28px,4vw,40px)', margin: 0 }}>
        {t('fantasy.odds.title')}
      </h1>
      <p style={{ color: 'var(--text-2)', marginTop: 8, lineHeight: 1.5 }}>{t('fantasy.odds.body')}</p>
      {odds.isLoading && <Skeleton height={200} radius={18} style={{ marginTop: 18 }} />}
      {odds.data && (
        <table className="fantasy-odds">
          <thead>
            <tr>
              <th>{t('fantasy.odds.rarity')}</th>
              <th>{t('fantasy.odds.chance')}</th>
              <th>{t('fantasy.odds.kits')}</th>
              <th>{t('fantasy.odds.dup')}</th>
            </tr>
          </thead>
          <tbody>
            {odds.data.map((o) => (
              <tr key={o.rarity}>
                <td>
                  <span aria-hidden="true" style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 999, background: isRarity(o.rarity) ? RARITY_COLOR[o.rarity] : '#999', marginRight: 8 }} />
                  {t('fantasy.rarity.' + o.rarity)}
                </td>
                <td className="mono">{o.odds}%</td>
                <td className="mono">{o.kits.toLocaleString('de-CH')}</td>
                <td className="mono">+{o.dup_points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <h2 className="title" style={{ marginTop: 28 }}>
        {t('fantasy.odds.rulesTitle')}
      </h2>
      <ul style={{ margin: '10px 0 0', paddingLeft: 20, display: 'grid', gap: 8, fontSize: 14.5, lineHeight: 1.5, color: 'var(--text-2)' }}>
        <li>{t('fantasy.odds.rule1', { n: FANTASY.cardsPerPack, h: FANTASY.packIntervalHours, s: FANTASY.packStack })}</li>
        <li>{t('fantasy.odds.rule2', { cost: FANTASY.extraPackCost, n: FANTASY.extraPacksPerDay })}</li>
        <li>{t('fantasy.odds.rule3')}</li>
        <li>{t('fantasy.odds.rule4')}</li>
        <li>{t('fantasy.odds.rule5')}</li>
      </ul>
    </Page>
  );
}
