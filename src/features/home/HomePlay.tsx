// "Every day something new": the daily shirt puzzle and the kit library as
// two big tiles that show what they are at a glance — today's mystery crop
// and a row of real kits from the library.
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { SHIRTS } from '../../data.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import * as db from '../../utils/db.ts';
import { ShirtGraphic } from '../../ui/index.ts';
import { MAX_TRIES, ZOOMS, focusFor, pickShirt } from '../daily/game.ts';
import { useDailyStatus } from '../daily/useDailyStatus.ts';

/** Kits everyone knows, to show what the library holds. */
const SHOWCASE = [
  '/library/sa/milan/2006-07-home-kit.webp',
  '/library/wc/brazil/1970-home-kit.webp',
  '/library/yb/2018-19-home-kit.webp',
  '/library/wc/netherlands/1988-home-kit.webp',
  '/library/bl/dortmund/1996-97-home-kit.webp',
  '/library/sa/napoli/1987-88-home-kit.webp'
];

const tile = { display: 'grid', gap: 18, padding: 'clamp(20px,2.6vw,32px)', borderRadius: 28, textDecoration: 'none', minWidth: 0, position: 'relative', overflow: 'hidden' } as const;
const kicker = { fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' } as const;
const big = { margin: '4px 0 0', fontSize: 'clamp(24px,2.8vw,34px)', lineHeight: 1.1, fontWeight: 800, letterSpacing: '-0.02em' } as const;
const cta = { justifySelf: 'start', display: 'inline-flex', alignItems: 'center', gap: 8, height: 48, padding: '0 22px', borderRadius: 999, fontWeight: 700, fontSize: 15.5 } as const;

export function HomePlay() {
  const { t } = usePrefs();
  return (
    <section aria-labelledby="play-title" style={{ maxWidth: 1360, margin: '0 auto', padding: 'clamp(40px,5vw,72px) var(--gutter) 0' }}>
      <h2 id="play-title" className="title" style={{ margin: '0 0 14px' }}>
        {t('home.play.title')}
      </h2>
      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))' }}>
        <PuzzleTile />
        <LibraryTile />
      </div>
    </section>
  );
}

function PuzzleTile() {
  const { t } = usePrefs();
  const d = useDailyStatus();
  // Today's shirt, cropped exactly as the puzzle starts — never more. Not
  // memoised: like the puzzle page, it follows the catalogue as it loads.
  const id = pickShirt(SHIRTS.map((s) => s.id), d.n);
  const shirt = SHIRTS.find((s) => s.id === id);
  const focus = shirt ? focusFor(shirt.id, d.n) : null;
  const status = d.played ? (d.played.won ? t('home.me.dailyWon', { n: d.played.tries }) : t('home.me.dailyLost')) : d.streak > 0 ? t('home.me.streak', { n: d.streak }) : null;
  return (
    <Link to="/daily" className="play-card" style={{ ...tile, gridTemplateColumns: 'minmax(0,1fr) clamp(120px,32%,200px)', alignItems: 'center', background: '#0A0C0B', color: '#F2F4F1' }}>
      <div style={{ display: 'grid', gap: 10, minWidth: 0 }}>
        <span style={{ ...kicker, color: '#4BFF8B' }}>🧩 {t('home.play.daily.kicker', { n: d.n })}</span>
        <p style={{ ...big, color: '#F2F4F1' }}>{t('home.play.daily.question')}</p>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, color: '#C9D0CB' }}>{t('home.play.daily.body')}</p>
        <span aria-hidden="true" style={{ display: 'flex', gap: 6, marginTop: 2 }}>
          {Array.from({ length: MAX_TRIES }, (_, i) => (
            <span key={i} style={{ width: 22, height: 8, borderRadius: 4, background: d.played && i < d.played.tries ? (d.played.won && i === d.played.tries - 1 ? '#4BFF8B' : '#5B635E') : 'rgba(255,255,255,0.16)' }} />
          ))}
        </span>
        {status && <span style={{ fontSize: 13.5, color: '#9AA39D' }}>{status}</span>}
        <span style={{ ...cta, background: '#4BFF8B', color: '#06110A', marginTop: 4 }}>{d.played ? t('home.me.dailySee') : t('home.play.daily.cta')} →</span>
      </div>
      <div role="img" aria-label={t('home.play.daily.cropLabel')} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 22, overflow: 'hidden', background: '#141816', boxShadow: 'inset 0 0 0 2px rgba(75,255,139,0.35)' }}>
        {shirt && focus && (
          <div style={{ position: 'absolute', inset: '6%', transform: `scale(${ZOOMS[0]})`, transformOrigin: `${focus.x}% ${focus.y}%` }}>
            <ShirtGraphic pat={shirt.pat} trim={shirt.trim} crest={shirt.crest} num={shirt.num} photo={shirt.photo} hero flat />
          </div>
        )}
        <span aria-hidden="true" style={{ position: 'absolute', left: 8, top: 8, padding: '3px 8px', borderRadius: 999, background: 'rgba(10,12,11,0.75)', color: '#F2F4F1', fontSize: 11, fontWeight: 650 }}>
          {t('home.play.daily.rule', { n: MAX_TRIES })}
        </span>
        <span aria-hidden="true" style={{ position: 'absolute', right: 10, bottom: 10, width: 38, height: 38, borderRadius: 999, display: 'grid', placeItems: 'center', background: '#4BFF8B', color: '#06110A', fontWeight: 900, fontSize: 20 }}>
          ?
        </span>
      </div>
    </Link>
  );
}

function LibraryTile() {
  const { t } = usePrefs();
  const counts = useQuery({ queryKey: ['kitCounts'], queryFn: db.loadKitCounts, staleTime: 5 * 60_000, retry: false });
  const kits = counts.data ? Object.values(counts.data).reduce((a, n) => a + n, 0) : null;
  return (
    <Link to="/library" className="card play-card" style={{ ...tile, color: 'var(--text)' }}>
      <div style={{ display: 'grid', gap: 10 }}>
        <span style={{ ...kicker, color: 'var(--accent)' }}>📚 {t('home.play.lib.kicker')}</span>
        <p style={big}>{kits ? t('home.play.lib.count', { n: kits.toLocaleString('de-CH') }) : t('home.play.lib.title')}</p>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, color: 'var(--text-2)' }}>{t('home.play.lib.body')}</p>
      </div>
      <ul aria-hidden="true" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8 }}>
        {SHOWCASE.map((src) => (
          <li key={src} style={{ aspectRatio: '1/1', borderRadius: 14, background: 'var(--sunken)', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
            <img src={src} alt="" loading="lazy" decoding="async" style={{ width: '88%', height: '88%', objectFit: 'contain' }} />
          </li>
        ))}
      </ul>
      <span className="btn btn--primary" style={{ justifySelf: 'start' }}>
        {t('home.play.lib.cta')} →
      </span>
    </Link>
  );
}
