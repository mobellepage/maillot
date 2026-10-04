import { describe, expect, it } from 'vitest';
import { encodeShareData, decodeShareData, parseShareHash } from '../utils/share.ts';

describe('share links', () => {
  const payload = { owner: 'Zoë', items: [{ id: 'ger-26', name: 'Germany 2026 Home "The Last Adidas"', priceFmt: 'CHF 140' }] };

  it('round-trips unicode payloads', () => {
    expect(decodeShareData(encodeShareData(payload))).toEqual(payload);
  });

  it('distinguishes "no link" from "broken link"', () => {
    expect(parseShareHash('')).toBeUndefined();
    expect(parseShareHash('#/orders')).toBeUndefined();
    expect(parseShareHash('#/vault/%%%not-base64')).toBeNull();
    expect(parseShareHash('#/vault/' + encodeURIComponent(encodeShareData(payload)))).toEqual(payload);
  });
});
