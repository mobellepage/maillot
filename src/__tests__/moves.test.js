import { describe, expect, it } from 'vitest';
import { weeklyMoves, weeklyRatios } from '../features/vault/moves.ts';

const h = (catalog_id, day, value) => ({ catalog_id, day, value });
const history = [h('ned-88', '2026-09-29', 300), h('ned-88', '2026-10-03', 320), h('ned-88', '2026-10-07', 330), h('sui-26', '2026-09-30', 100), h('sui-26', '2026-10-07', 95), h('new-26', '2026-10-06', 80), h('new-26', '2026-10-07', 90)];

describe('collection moves', () => {
  it('compares each shirt with its value a week earlier', () => {
    const r = weeklyRatios(history);
    expect(r.get('ned-88')).toBeCloseTo(1.1); // 330 vs 300 (Sep 29 is the last day ≥ 7 days back)
    expect(r.get('sui-26')).toBeCloseTo(0.95);
    expect(r.has('new-26')).toBe(false); // no week-old value yet
  });

  it('adds up the moves of what you own, in your item values', () => {
    const m = weeklyMoves(
      [
        { id: 'a', catalogId: 'ned-88', name: 'Holland 88', value: 440 }, // +10 % → +40
        { id: 'b', catalogId: 'sui-26', name: 'Schweiz 26', value: 95 }, // −5 % → −5
        { id: 'c', catalogId: 'new-26', name: 'New', value: 90 },
        { id: 'd', catalogId: null, name: 'Custom', value: 50 }
      ],
      history
    );
    expect(m.change).toBeCloseTo(35, 0);
    expect(m.pct).toBeCloseTo(7, 1); // 35 on a week-old 500 (only shirts with history count)
    expect(m.movers.map((x) => x.id)).toEqual(['a', 'b']);
    expect(m.movers[0].pct).toBeCloseTo(10);
  });

  it('says nothing without history', () => {
    expect(weeklyMoves([{ id: 'a', catalogId: 'ned-88', name: 'x', value: 100 }], [])).toBe(null);
  });
});
