// "Every day something new": the daily shirt puzzle and the other reasons to
// come back (try-on studio, kit library), as a row of cards on the home page.
import { useState } from 'react';
import { Link } from 'react-router';
import { usePrefs } from '../../lib/prefs.tsx';
import { dayKey, puzzleNumber } from '../daily/game.ts';

export interface PlayCard {
  to: string;
  kicker: string;
  title: string;
  body: string;
  emoji: string;
}

export function HomePlay({ extra = [] }: { extra?: PlayCard[] }) {
  const { t } = usePrefs();
  const [n] = useState(() => puzzleNumber(dayKey()));
  const cards: PlayCard[] = [{ to: '/daily', kicker: t('home.play.daily.kicker', { n }), title: t('home.play.daily.title'), body: t('home.play.daily.body'), emoji: '🧩' }, ...extra];
  return (
    <section aria-labelledby="play-title" style={{ maxWidth: 1360, margin: '0 auto', padding: 'clamp(40px,5vw,72px) var(--gutter) 0' }}>
      <h2 id="play-title" className="title" style={{ margin: '0 0 14px' }}>
        {t('home.play.title')}
      </h2>
      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,260px),1fr))' }}>
        {cards.map((c) => (
          <Link key={c.to} to={c.to} className="card play-card" style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: 20, borderRadius: 22, color: 'var(--text)', textDecoration: 'none' }}>
            <span aria-hidden="true" style={{ fontSize: 30, lineHeight: 1, flex: 'none' }}>
              {c.emoji}
            </span>
            <span>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--accent)' }}>{c.kicker}</span>
              <span style={{ display: 'block', fontSize: 18, fontWeight: 800, marginTop: 2 }}>{c.title}</span>
              <span style={{ display: 'block', fontSize: 14, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.45 }}>{c.body}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
