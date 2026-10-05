import { describe, expect, it } from 'vitest';
import { isChunkError } from '../app/chunkError.ts';

describe('isChunkError', () => {
  it('recognises stale-deploy import failures across browsers', () => {
    expect(isChunkError(new TypeError('Failed to fetch dynamically imported module: https://x/assets/Page-abc.js'))).toBe(true); // Chrome
    expect(isChunkError(new TypeError('Importing a module script failed.'))).toBe(true); // Safari
    expect(isChunkError(new TypeError('error loading dynamically imported module'))).toBe(true); // Firefox
  });
  it('leaves real crashes alone', () => {
    expect(isChunkError(new TypeError("Cannot read properties of undefined (reading 'id')"))).toBe(false);
    expect(isChunkError(null)).toBe(false);
  });
});
