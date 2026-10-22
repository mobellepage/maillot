import { describe, expect, it } from 'vitest';
import { deltaText, priceText, squadProblems, transferHits, transfersMade, untilText } from '../features/fantasy/model.ts';
import { FANTASY } from '../config/fantasy.ts';

const pick = (id, league, price, nat = false) => ({ club_id: id, league, price, is_national: nat });

describe('Fantasy helpers', () => {
  it('counts down to the deadline', () => {
    const now = Date.UTC(2026, 9, 22, 12, 0);
    expect(untilText(new Date(now + 11 * 3_600_000 + 23 * 60_000).toISOString(), now)).toBe('11h 23m');
    expect(untilText(new Date(now + 5 * 60_000).toISOString(), now)).toBe('5m');
    expect(untilText(new Date(now + 3 * 24 * 3_600_000 + 2 * 3_600_000).toISOString(), now)).toBe('3d 2h');
    expect(untilText(new Date(now - 1000).toISOString(), now)).toBe('now');
    expect(untilText(null, now)).toBeNull();
  });
  it('keeps the squad rules: eight, within budget, two per league', () => {
    const eight = [pick('a', 'Premier League', 22), pick('b', 'Premier League', 21), pick('c', 'La Liga', 22), pick('d', 'La Liga', 5), pick('e', 'Serie A', 10), pick('f', 'Ligue 1', 6), pick('g', 'Bundesliga', 7), pick('h', 'Eredivisie', 5)];
    expect(squadProblems(eight).problems).toEqual([]);
    expect(squadProblems(eight).cost).toBe(98);
    expect(squadProblems(eight.slice(0, 7)).problems).toContain('size');
    expect(squadProblems([...eight.slice(0, 7), pick('i', 'Primeira Liga', 9)]).problems).toContain('budget');
    const three = squadProblems([...eight.slice(0, 7), pick('i', 'Premier League', 4)]);
    expect(three.problems).toContain('league');
    expect(three.leagues).toEqual(['Premier League']);
    // Nations don't count against the per-league limit.
    expect(squadProblems([...eight.slice(0, 5), pick('x', 'National Teams', 5, true), pick('y', 'National Teams', 5, true), pick('z', 'National Teams', 5, true)]).problems).toEqual([]);
  });
  it('prices transfers: free ones, hits, chips, the first build', () => {
    expect(transfersMade(['a', 'b', 'c'], ['a', 'b', 'd'])).toBe(1);
    expect(transfersMade(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(0);
    expect(transferHits(1, 1, null, true)).toBe(0);
    expect(transferHits(3, 1, null, true)).toBe(2 * FANTASY.hitPoints);
    expect(transferHits(3, 2, null, true)).toBe(FANTASY.hitPoints);
    expect(FANTASY.freeTransfersMax).toBe(5);
    expect(transferHits(5, 1, 'wildcard', true)).toBe(0);
    expect(transferHits(5, 1, 'free_hit', true)).toBe(0);
    expect(transferHits(5, 1, 'bench_boost', true)).toBe(4 * FANTASY.hitPoints);
    expect(transferHits(8, 1, null, false)).toBe(0);
  });
  it('writes prices and moves', () => {
    expect(priceText(12)).toBe('12.0 M');
    expect(priceText('4.5')).toBe('4.5 M');
    expect(deltaText(0.4)).toBe('+0.4');
    expect(deltaText(-0.5)).toBe('−0.5');
    expect(deltaText(0)).toBeNull();
    expect(deltaText(null)).toBeNull();
  });
});
