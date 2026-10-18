import { describe, expect, it } from 'vitest';
import { chosenVisibility, flowFor } from '../features/vault/addshirt/useAddShirtForm.ts';

describe('adding a shirt: collection or sale', () => {
  it('just for the collection skips the extra photos and the checks', () => {
    expect(flowFor('collection')).toEqual([0, 1, 2, 6]);
  });
  it('for sale goes through every photo and both checks', () => {
    expect(flowFor('sale')).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
  it('a shirt added for sale is saved for sale unless the member chose otherwise', () => {
    expect(chosenVisibility({ visibility: null, goal: 'sale' }, false)).toBe('forsale');
    expect(chosenVisibility({ visibility: 'offers', goal: 'sale' }, false)).toBe('offers');
    expect(chosenVisibility({ visibility: null, goal: 'collection' }, false)).toBe('public');
    expect(chosenVisibility({ visibility: null, goal: 'collection' }, true)).toBe('private');
  });
});
