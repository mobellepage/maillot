import { describe, expect, it } from 'vitest';
import { dayKey, judge, pickShirt, puzzleNumber, shareText, solved, stats } from '../features/daily/game.ts';

describe('daily puzzle', () => {
  it('changes at midnight in Zurich', () => {
    expect(dayKey(new Date('2026-10-14T21:59:00Z'))).toBe('2026-10-14');
    expect(dayKey(new Date('2026-10-14T22:01:00Z'))).toBe('2026-10-15');
    expect(puzzleNumber('2026-10-13')).toBe(1);
    expect(puzzleNumber('2026-11-12')).toBe(31);
  });
  it('gives everyone the same shirt and goes through the whole catalogue', () => {
    const ids = ['a', 'b', 'c', 'd'];
    expect(pickShirt(ids, 3)).toBe(pickShirt([...ids].reverse(), 3));
    expect(new Set([1, 2, 3, 4].map((n) => pickShirt(ids, n))).size).toBe(4);
    expect(pickShirt([], 1)).toBeNull();
  });
  it('judges club and season', () => {
    const answer = { club: 'Bayern München', year: 1997 };
    expect(judge({ club: 'bayern munchen', year: 1997 }, answer)).toEqual({ club: true, season: 'exact', dir: null });
    expect(judge({ club: 'Ajax', year: 1995 }, answer)).toEqual({ club: false, season: 'close', dir: 'later' });
    expect(judge({ club: 'Ajax', year: 2005 }, answer)).toEqual({ club: false, season: 'far', dir: 'earlier' });
    expect(solved(judge({ club: 'Bayern München', year: 1997 }, answer))).toBe(true);
  });
  it('shares a spoiler-free grid', () => {
    const v = [judge({ club: 'Ajax', year: 1995 }, { club: 'PSV', year: 1996 }), judge({ club: 'PSV', year: 1996 }, { club: 'PSV', year: 1996 })];
    expect(shareText(7, v, true, 'Maillot', 'https://x.app/daily')).toBe('Maillot #7 2/5\n⬛🟨\n🟩🟩\nhttps://x.app/daily');
  });
  it('counts streaks', () => {
    const r = [
      { day: '2026-10-14', won: true, tries: 2 },
      { day: '2026-10-15', won: true, tries: 3 },
      { day: '2026-10-16', won: false, tries: 5 },
      { day: '2026-10-17', won: true, tries: 1 },
      { day: '2026-10-18', won: true, tries: 4 }
    ];
    expect(stats(r, '2026-10-19')).toMatchObject({ played: 5, wins: 4, winPct: 80, current: 2, max: 2, dist: [1, 1, 1, 1, 0] });
    expect(stats(r, '2026-10-20').current).toBe(0);
  });
});
