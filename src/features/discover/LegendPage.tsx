// /legends/:slug — every kit a legend wore, club and national team, season
// by season. Kit pictures only, no portraits.
import { Link, Navigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import * as db from '../../utils/db.ts';
import type { KitTile } from '../../utils/db.ts';
import { ErrorState, Page, Skeleton } from '../../ui/index.ts';
import { KitDisc } from './KitDisc.tsx';
import { LEGEND_BY } from './model.ts';
import { Legends } from './Legends.tsx';

export default function LegendPage() {
  const { t } = usePrefs();
  const legend = LEGEND_BY[useParams().slug ?? ''];
  usePageMeta(legend ? t('legend.title', { name: legend.name }) : t('home.legends.title'), legend ? t('legend.intro', { name: legend.name }) : undefined);
  const kits = useQuery({ queryKey: ['legendKits', legend?.slug], queryFn: () => db.loadLegendKits(legend!.slug), enabled: !!legend, staleTime: 30 * 60_000 });
  if (!legend) return <Navigate to="/" replace />;

  const years: { year: number; kits: KitTile[] }[] = [];
  for (const k of kits.data ?? []) {
    const y = k.season_year ?? 0;
    if (years.at(-1)?.year !== y) years.push({ year: y, kits: [] });
    years.at(-1)!.kits.push(k);
  }
  const teams = new Set((kits.data ?? []).map((k) => k.club_id)).size;

  return (
    <>
      <Page>
        <div className="eyebrow">
          <Link to="/">{t('nav.discover')}</Link> · {t('home.legends.title')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(14px,3vw,24px)', marginTop: 10 }}>
          <img src={legend.img} alt={legend.name} width={120} height={120} style={{ width: 'clamp(84px,14vw,120px)', height: 'auto', aspectRatio: '1/1', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--kit-tile-line)', background: 'var(--kit-tile)', flex: 'none' }} />
          <div style={{ minWidth: 0 }}>
            <h1 className="display" style={{ fontSize: 'clamp(28px,5vw,48px)', margin: 0 }}>
              {t('legend.title', { name: legend.name })}
            </h1>
            <p style={{ color: 'var(--text-2)', margin: '8px 0 0', fontSize: 15, lineHeight: 1.5, maxWidth: 680 }}>{t('legend.intro', { name: legend.name })}</p>
          </div>
        </div>
        {kits.data && kits.data.length > 0 && (
          <p className="mono" style={{ fontSize: 12.5, color: 'var(--muted)', margin: '8px 0 0' }}>
            {t('legend.stats', { kits: kits.data.length, teams })}
          </p>
        )}
        {kits.isLoading && <Skeleton height={320} radius={20} style={{ marginTop: 22 }} />}
        {kits.isError && <ErrorState what={legend.name} onRetry={() => kits.refetch()} />}
        {kits.data && !kits.data.length && <p style={{ color: 'var(--muted)', marginTop: 16 }}>{t('era.none')}</p>}
        {years.map((g) => (
          <section key={g.year} aria-labelledby={'y-' + g.year} style={{ marginTop: 26 }}>
            <h2 id={'y-' + g.year} className="title" style={{ margin: '0 0 12px' }}>
              {g.year}
            </h2>
            <ul className="kit-disc-grid">
              {g.kits.map((k) => (
                <li key={k.id}>
                  <KitDisc kit={k} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </Page>
      <Legends except={legend.slug} />
      <div style={{ height: 48 }} />
    </>
  );
}
