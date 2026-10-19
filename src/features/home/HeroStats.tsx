// Hero stats: a real number only shows once it's meaningful; until then the
// slots carry concrete promises instead of invented traction.
import { usePublicStats } from '../market/queries.ts';
import { usePrefs } from '../../lib/prefs.tsx';

export function HeroStats() {
  const stats = usePublicStats().data;
  const { money, t } = usePrefs();
  const compact = (n: number) => (n >= 1e6 ? 'CHF ' + (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? 'CHF ' + Math.round(n / 1e3) + 'k' : money(n));
  const real = stats
    ? [
        Number(stats.traded_chf) >= 50000 && { value: compact(Number(stats.traded_chf)), label: t('home.stat.traded') },
        Number(stats.collectors) >= 1000 && { value: Number(stats.collectors).toLocaleString('de-CH'), label: t('home.stat.collectors') },
      ].filter((x): x is { value: string; label: string } => !!x)
    : [];
  const promises = [
    { value: t('home.stat.capture'), label: t('home.stat.captureSub') },
    { value: t('home.stat.value'), label: t('home.stat.valueSub') },
    { value: t('home.stat.verified'), label: t('home.stat.verifiedSub') }
  ];
  return (
    <dl style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(20px,4vw,48px)', margin: '40px 0 0', justifyContent: 'center' }}>
      {[...real, ...promises].slice(0, 3).map((x) => (
        <div key={x.label} style={{ display: 'flex', flexDirection: 'column-reverse' }}>
          <dt style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{x.label}</dt>
          <dd className="mono" style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>
            {x.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
