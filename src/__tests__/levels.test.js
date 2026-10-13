import { describe, expect, it } from 'vitest';
import { levelFor } from '../features/levels/levels.ts';

describe('levelFor', () => {
  it('has no level before the first shirt', () => {
    expect(levelFor(0, 0)).toMatchObject({ level: null, rank: 0, next: { key: 'rookie' }, shirtsToGo: 1 });
  });
  it('the first shirt makes a rookie', () => {
    expect(levelFor(1, 80)).toMatchObject({ rank: 1, level: { key: 'rookie' }, next: { key: 'fan' }, shirtsToGo: 4, valueToGo: 320 });
  });
  it('either path counts: few but valuable shirts', () => {
    expect(levelFor(3, 1600).level.key).toBe('collector');
  });
  it('either path counts: many cheap shirts', () => {
    expect(levelFor(15, 300).level.key).toBe('collector');
  });
  it('progress follows the path that is further along', () => {
    expect(levelFor(5, 1200).progress).toBeCloseTo((1200 - 400) / (1500 - 400));
  });
  it('the top level has nothing next', () => {
    expect(levelFor(250, 0)).toMatchObject({ rank: 7, next: null, progress: 1 });
  });
});
