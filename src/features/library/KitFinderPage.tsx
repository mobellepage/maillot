// /library/find — kits by colour and era, e.g. for an outfit: "a red retro
// shirt". Colour families come from each kit's picture (library_find); the
// choice lives in the URL (?color=red&era=retro&kind=home&league=…), so a
// search can be shared or kept.
import { Link, useSearchParams } from 'react-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import * as db from '../../utils/db.ts';
import type { KitColor, KitQuery } from '../../utils/db.ts';
import { Button, ErrorState, Page, Skeleton } from '../../ui/index.ts';
import { KitDisc } from '../discover/KitDisc.tsx';
import { eraNumber } from '../discover/model.ts';
import { TOP5 } from './model.ts';

const PAGE = 48;

/** The colour chips, each with its swatch. */
const COLORS: { key: KitColor; swatch: string }[] = [
  { key: 'red', swatch: '#D7192A' },
  { key: 'claret', swatch: '#7A1B2E' },
  { key: 'orange', swatch: '#F26B1D' },
  { key: 'yellow', swatch: '#F5CF1E' },
  { key: 'green', swatch: '#1E8C45' },
  { key: 'sky', swatch: '#6CB4EE' },
  { key: 'blue', swatch: '#1D4FC4' },
  { key: 'navy', swatch: '#14244F' },
  { key: 'purple', swatch: '#6B3FA0' },
  { key: 'pink', swatch: '#F07AAE' },
  { key: 'white', swatch: '#F7F7F5' },
  { key: 'black', swatch: '#141414' },
  { key: 'grey', swatch: '#9A9CA1' }
];

/** Eras: "retro" is everything up to 1999; then the decades. */
const ERAS: { key: string; from: number | null; to: number | null }[] = [
  { key: 'retro', from: null, to: 1999 },
  ...[1960, 1970, 1980, 1990, 2000, 2010, 2020].map((d) => ({ key: String(d), from: d, to: d + 9 }))
];
const KINDS = ['home', 'away', 'third', 'goalkeeper', 'special'] as const;
const LEAGUES: readonly string[] = [...TOP5, 'Swiss Super League', 'National Teams'];

export default function KitFinderPage() {
  const { t } = usePrefs();
  const [params, setParams] = useSearchParams();
  const color = COLORS.find((c) => c.key === params.get('color'))?.key ?? null;
  const era = ERAS.find((e) => e.key === params.get('era')) ?? null;
  const kind = (KINDS as readonly string[]).includes(params.get('kind') ?? '') ? params.get('kind') : null;
  const league = LEAGUES.includes(params.get('league') ?? '') ? params.get('league') : null;
  const query: KitQuery = { color, from: era?.from ?? null, to: era?.to ?? null, kind, league };
  usePageMeta(t('find.meta'), t('find.intro'));

  // One choice per row; tapping the chosen one again clears it.
  const pick = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null || next.get(key) === value) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const kits = useInfiniteQuery({
    queryKey: ['findKits', query],
    queryFn: ({ pageParam }) => db.findKits(query, pageParam, PAGE),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.kits.length === PAGE ? all.length * PAGE : undefined),
    staleTime: 10 * 60_000
  });
  const list = kits.data?.pages.flatMap((p) => p.kits) ?? [];
  const total = kits.data?.pages[0]?.total ?? 0;
  const chosen = !!(color || era || kind || league);
  const eraLabel = (key: string) => (key === 'retro' ? t('find.retro') : t('era.label', { d: eraNumber(Number(key)) }));

  return (
    <Page>
      <div className="eyebrow">
        <Link to="/library">{t('lib.title')}</Link> · {t('find.title')}
      </div>
      <h1 className="display" style={{ fontSize: 'clamp(30px,5vw,48px)', margin: '6px 0 0' }}>
        {t('find.title')}
      </h1>
      <p style={{ color: 'var(--text-2)', margin: '8px 0 0', fontSize: 15, lineHeight: 1.5, maxWidth: 680 }}>{t('find.intro')}</p>

      <div role="group" aria-label={t('find.color')} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 20 }}>
        {COLORS.map((c) => (
          <button key={c.key} type="button" className="option-btn" aria-pressed={color === c.key} onClick={() => pick('color', c.key)} style={{ padding: '6px 12px 6px 7px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: '50%', background: c.swatch, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.18)', flex: 'none' }} />
            {t('find.c.' + c.key)}
          </button>
        ))}
      </div>
      <div role="group" aria-label={t('find.era')} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
        {ERAS.map((e) => (
          <button key={e.key} type="button" className="option-btn" aria-pressed={era?.key === e.key} onClick={() => pick('era', e.key)} style={{ padding: '7px 13px', fontSize: 13 }}>
            {eraLabel(e.key)}
          </button>
        ))}
      </div>
      <div role="group" aria-label={t('find.kind')} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
        {KINDS.map((k) => (
          <button key={k} type="button" className="option-btn" aria-pressed={kind === k} onClick={() => pick('kind', k)} style={{ padding: '7px 13px', fontSize: 13 }}>
            {t('lib.kind.' + k)}
          </button>
        ))}
      </div>
      <div role="group" aria-label={t('lib.leagues')} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
        {LEAGUES.map((l) => (
          <button key={l} type="button" className="option-btn" aria-pressed={league === l} onClick={() => pick('league', l)} style={{ padding: '7px 13px', fontSize: 13 }}>
            {l === 'National Teams' ? t('lib.nations') : l}
          </button>
        ))}
      </div>

      <div aria-live="polite" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 15 }}>{kits.data ? t('find.count', { n: total.toLocaleString('de-CH') }) : ' '}</strong>
        {chosen && (
          <button type="button" className="link-btn" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
            {t('find.reset')}
          </button>
        )}
      </div>

      {kits.isLoading && <Skeleton height={320} radius={20} style={{ marginTop: 14 }} />}
      {kits.isError && <ErrorState what={t('find.title')} onRetry={() => kits.refetch()} />}
      <ul className="kit-disc-grid" style={{ marginTop: 14 }}>
        {list.map((k) => (
          <li key={k.id}>
            <KitDisc kit={k} />
          </li>
        ))}
      </ul>
      {kits.data && !list.length && <p style={{ color: 'var(--muted)', marginTop: 16 }}>{t('find.none')}</p>}
      {kits.hasNextPage && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
          <Button variant="secondary" onClick={() => kits.fetchNextPage()} busy={kits.isFetchingNextPage} disabled={kits.isFetchingNextPage}>
            {t('era.more')}
          </Button>
        </div>
      )}
    </Page>
  );
}
