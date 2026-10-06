// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFlash } from '../ui/useFlash.ts';

const setup = (value, scope = 'ger-26M') => renderHook((p) => useFlash(p.value, p.scope), { initialProps: { value, scope } });

describe('useFlash', () => {
  it('stays calm on first render and when a price first appears', () => {
    const h = setup(undefined);
    expect(h.result.current).toBe(null);
    h.rerender({ value: 139, scope: 'ger-26M' });
    expect(h.result.current).toBe(null);
  });

  it('flashes up or down when the live price moves, restarting each time', () => {
    const h = setup(139);
    h.rerender({ value: 150, scope: 'ger-26M' });
    expect(h.result.current).toEqual({ dir: 'up', n: 1 });
    h.rerender({ value: 120, scope: 'ger-26M' });
    expect(h.result.current).toEqual({ dir: 'down', n: 2 });
    h.rerender({ value: 120, scope: 'ger-26M' });
    expect(h.result.current).toEqual({ dir: 'down', n: 2 });
  });

  it('does not flash when the user switches to another size', () => {
    const h = setup(139);
    h.rerender({ value: 99, scope: 'ger-26L' });
    expect(h.result.current).toBe(null);
  });
});
