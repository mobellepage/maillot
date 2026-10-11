import { describe, expect, it } from 'vitest';
import { chosenVisibility } from '../features/vault/addshirt/useAddShirtForm.ts';

describe('chosenVisibility', () => {
  it('saves new shirts as public by default', () => {
    expect(chosenVisibility({ visibility: null }, false)).toBe('public');
  });
  it('saves them as private when the whole collection is private', () => {
    expect(chosenVisibility({ visibility: null }, true)).toBe('private');
  });
  it('keeps what the member picked', () => {
    expect(chosenVisibility({ visibility: 'private' }, false)).toBe('private');
    expect(chosenVisibility({ visibility: 'offers' }, true)).toBe('offers');
  });
});
