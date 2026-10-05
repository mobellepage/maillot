import { describe, expect, it } from 'vitest';
import { buildShirt, BY, replaceCatalog, SHIRTS } from '../data.ts';

const raw = { ...BY['ger-26'], price: 140 };

describe('catalogue pricing', () => {
  it('uses the index estimate until real trades exist', () => {
    const s = buildShirt(raw);
    expect(s.priceSource).toBe('estimate');
    expect(s.price).toBe(140);
    expect(s.indexPrice).toBe(140);
  });

  it('switches to the average of recent real sales once there are any', () => {
    const s = buildShirt(raw, { count: 3, lastPrice: 150, lastSoldAt: '2026-10-01T00:00:00Z', avgRecent: 152.4 });
    expect(s.priceSource).toBe('trades');
    expect(s.price).toBe(152);
    expect(s.indexPrice).toBe(140);
  });

  it('keeps database sizes and SKU over generated ones', () => {
    const s = buildShirt({ ...raw, sizes: ['M', 'L'], sku: 'KV-1' });
    expect(s.sizes).toEqual(['M', 'L']);
    expect(s.sku).toBe('KV-1');
  });
});

describe('live catalogue store', () => {
  it('replaces the catalogue in place so existing references see it', () => {
    const ref = SHIRTS;
    const before = SHIRTS.slice();
    replaceCatalog([buildShirt({ ...raw, id: 'only-one' })]);
    expect(ref).toHaveLength(1);
    expect(BY['only-one']).toBeDefined();
    expect(BY['ger-26']).toBeUndefined();
    replaceCatalog(before);
    expect(SHIRTS).toHaveLength(before.length);
  });
});
