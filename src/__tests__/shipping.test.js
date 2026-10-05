import { describe, expect, it } from 'vitest';
import { detectCarrier, normalizeTracking, trackingUrl } from '../features/orders/shipping.ts';

describe('detectCarrier', () => {
  it.each([
    ['99.00.123456.12345678', 'post'],
    ['RR 123 456 789 CH', 'post'],
    ['1Z999AA10123456784', 'ups'],
    ['JJD0001234567890', 'dhl'],
    ['1234567890', 'dhl'],
    ['01234567890123', 'dpd'],
    ['12345678901', 'gls']
  ])('%s -> %s', (code, carrier) => expect(detectCarrier(code)).toBe(carrier));

  it('returns null for unknown or empty codes', () => {
    expect(detectCarrier('')).toBeNull();
    expect(detectCarrier('hello')).toBeNull();
    expect(detectCarrier('LX123456789DE')).toBeNull();
  });
});

describe('trackingUrl', () => {
  it('strips separators and links to the carrier', () => {
    expect(normalizeTracking('99.00 1234-56')).toBe('9900123456');
    expect(trackingUrl('post', '99.00.123456.12345678')).toBe('https://service.post.ch/ekp-web/ui/entry/search/990012345612345678');
  });
  it('falls back to detection when the carrier is unknown', () => {
    expect(trackingUrl(null, '1Z999AA10123456784')).toContain('ups.com');
  });
  it('has no link for "other" carriers or missing codes', () => {
    expect(trackingUrl('other', 'ABC')).toBeNull();
    expect(trackingUrl('post', '')).toBeNull();
  });
});
