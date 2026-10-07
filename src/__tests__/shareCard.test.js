import { describe, expect, it } from 'vitest';
import { mainColor } from '../features/vault/shareCard.ts';

describe('collection share card', () => {
  it('takes the shirt’s main colour from its CSS background', () => {
    expect(mainColor('#1d7ad6')).toBe('#1d7ad6');
    expect(mainColor('repeating-linear-gradient(135deg,#f47c20 0 10px,#e66a10 10px 20px)')).toBe('#f47c20');
    expect(mainColor('linear-gradient(rgba(255,0,0,1), #000)')).toBe('rgba(255,0,0,1)');
    expect(mainColor('none')).toBe('#4BFF8B');
  });
});
