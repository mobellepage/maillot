import { describe, expect, it } from 'vitest';
import { guideFor, nextMissing, photoIssues } from '../features/vault/addshirt/guide.ts';

describe('guided capture rules', () => {
  it('frames each shot with the right outline', () => {
    expect(guideFor('front')).toBe('shirt');
    expect(guideFor('product_code')).toBe('label');
    expect(guideFor('crest')).toBe('square');
    expect(guideFor('patch_Champions League')).toBe('square');
  });
  it('lists photo problems, blur first', () => {
    expect(photoIssues({ blurry: true, tooDark: true })).toEqual(['gc.issue.blurry', 'gc.issue.dark']);
    expect(photoIssues({})).toEqual([]);
  });
  it('moves to the next missing shot and wraps around', () => {
    const keys = ['front', 'back', 'crest'];
    expect(nextMissing(keys, { front: 1 })).toBe('back');
    expect(nextMissing(keys, { back: 1 }, 'back')).toBe('crest');
    expect(nextMissing(keys, { crest: 1 }, 'crest')).toBe('front');
    expect(nextMissing(keys, { front: 1, back: 1, crest: 1 })).toBeNull();
  });
});
