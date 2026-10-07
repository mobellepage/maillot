import { describe, expect, it } from 'vitest';
import { appPathFromUrl, isNative } from '../lib/native.ts';

const SITE = 'https://maillot-two.vercel.app';

describe('deep links into the iOS app', () => {
  it('turns maillot:// links into in-app paths, keeping the query', () => {
    expect(appPathFromUrl('maillot://orders?checkout=success&order=abc', SITE)).toBe('/orders?checkout=success&order=abc');
    expect(appPathFromUrl('maillot://shirt/ned-88', SITE)).toBe('/shirt/ned-88');
    expect(appPathFromUrl('maillot://vault/?payouts=done', SITE)).toBe('/vault?payouts=done');
  });

  it('opens links to our own website in the app', () => {
    expect(appPathFromUrl(SITE + '/verify/MLT-1234', SITE)).toBe('/verify/MLT-1234');
  });

  it('ignores other sites, other schemes and path tricks', () => {
    expect(appPathFromUrl('https://evil.example/orders', SITE)).toBe(null);
    expect(appPathFromUrl('javascript:alert(1)', SITE)).toBe(null);
    expect(appPathFromUrl('maillot://orders/..%2F..%2Fx', SITE)).toBe(null);
    expect(appPathFromUrl('not a url', SITE)).toBe(null);
    // The /return page's handover can't be turned into a protocol-relative URL.
    expect(appPathFromUrl('maillot://' + '/evil.example', SITE)).toBe('/evil.example');
    expect(appPathFromUrl('maillot:/' + '//evil.example/x')).not.toMatch(/^\/\//);
  });

  it('is off on the web', () => {
    expect(isNative()).toBe(false);
  });
});
