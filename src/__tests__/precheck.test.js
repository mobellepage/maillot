import { describe, expect, it } from 'vitest';
import { precheck } from '../features/vault/addshirt/useAddShirtForm.ts';

const sharp = { dataUrl: 'data:', lowRes: false, blurry: false };
const form = (over = {}) => ({
  catalogId: 'ger-26',
  proposed: false,
  version: 'Fan-Replica',
  photos: { product_code: sharp, front: sharp },
  scan: { status: 'done', ocrText: 'Germany 2026 Home Adidas', confidence: 1, matchId: 'ger-26' },
  ...over
});

describe('pre-check (fraud heuristics)', () => {
  it('passes a clean submission', () => {
    expect(precheck(form())).toMatchObject({ status: 'ok' });
  });

  it('flags a label that confidently matches a different shirt as a possible fake', () => {
    const r = precheck(form({ scan: { status: 'done', ocrText: 'Netherlands 1988', confidence: 1, matchId: 'ned-88' } }));
    expect(r.status).toBe('fake');
    expect(r.notes.join(' ')).toMatch(/anderen Katalogartikel/);
  });

  it('asks for review when no text could be read or photos are blurry', () => {
    expect(precheck(form({ scan: { status: 'done', ocrText: '', confidence: 0, matchId: null } })).status).toBe('review');
    expect(precheck(form({ photos: { product_code: { ...sharp, blurry: true } } })).status).toBe('review');
  });

  it('escalates to fake when three or more problems stack up', () => {
    const r = precheck(form({ version: 'Player-Issue / Authentic', photos: { product_code: { ...sharp, lowRes: true, blurry: true } }, scan: { status: 'done', ocrText: '', confidence: 0, matchId: null } }));
    expect(r.status).toBe('fake');
  });
});
