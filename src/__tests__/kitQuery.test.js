import { describe, expect, it } from 'vitest';
import { parseKitQuery } from '../features/home/kitQuery.ts';

describe('parseKitQuery', () => {
  it('reads club, season and kind', () => {
    expect(parseKitQuery('Milan 2006/07')).toEqual({ club: 'milan', year: 2006, season: '2006/07', kind: null });
    expect(parseKitQuery('YB Heim')).toEqual({ club: 'yb', year: null, season: null, kind: 'home' });
    expect(parseKitQuery('Brazil 1970 away shirt')).toEqual({ club: 'brazil', year: 1970, season: null, kind: 'away' });
    expect(parseKitQuery('«Napoli 1987-88»')).toEqual({ club: 'napoli', year: 1987, season: '1987/88', kind: null });
  });
  it('keeps numbers that belong to the club name', () => {
    expect(parseKitQuery('Schalke 04 2001').club).toBe('schalke 04');
    expect(parseKitQuery('Mainz 05').year).toBe(null);
  });
  it('is empty for an empty query', () => {
    expect(parseKitQuery('  ')).toEqual({ club: '', year: null, season: null, kind: null });
  });
});
