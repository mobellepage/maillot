import { describe, expect, it } from 'vitest';
import { precheck } from '../features/vault/addshirt/precheck.ts';

const sharp = { dataUrl: 'data:', lowRes: false, blurry: false };
const seen = (over = {}) => ({ isShirt: true, catalogId: 'ger-26', confidence: 0.95, authenticityConcerns: [], ...over });
const form = (over = {}) => ({
  catalogId: 'ger-26',
  proposed: false,
  version: 'Fan-Replica',
  photos: { product_code: sharp, front: sharp },
  scan: { status: 'done', confidence: 0.95, matchId: 'ger-26', result: seen() },
  ...over
});

describe('pre-check (fraud heuristics)', () => {
  it('passes a clean submission', () => {
    expect(precheck(form())).toMatchObject({ status: 'ok' });
  });

  it('flags a label that confidently matches a different shirt as a possible fake', () => {
    const r = precheck(form({ scan: { status: 'done', confidence: 0.9, matchId: 'ned-88', result: seen({ catalogId: 'ned-88' }) } }));
    expect(r.status).toBe('fake');
    expect(r.notes).toContain('pc.otherItem');
  });

  it('asks for review when the shirt wasn’t recognised or photos are blurry', () => {
    expect(precheck(form({ scan: { status: 'error', confidence: 0, matchId: null, result: null } })).status).toBe('review');
    expect(precheck(form({ photos: { product_code: { ...sharp, blurry: true } } })).status).toBe('review');
  });

  it('escalates to fake when three or more problems stack up', () => {
    const r = precheck(form({ version: 'Player-Issue / Authentic', photos: { product_code: { ...sharp, lowRes: true, blurry: true } }, scan: { status: 'error', confidence: 0, matchId: null, result: null } }));
    expect(r.status).toBe('fake');
  });

  it('passes recognition concerns on to the authentication check', () => {
    const r = precheck(form({ scan: { status: 'done', confidence: 0.95, matchId: 'ger-26', result: seen({ authenticityConcerns: ['Label font unusual for 2026'] }) } }));
    expect(r.status).toBe('review');
    expect(r.notes).toContain('pc.aiConcerns');
  });

  it('asks for review when the photos show something other than a shirt', () => {
    expect(precheck(form({ scan: { status: 'done', confidence: 0, matchId: null, result: seen({ isShirt: false, catalogId: null }) } })).notes).toContain('pc.notShirt');
  });

  it('treats a low-confidence recognition of the chosen shirt as a weak match', () => {
    expect(precheck(form({ scan: { status: 'done', confidence: 0.4, matchId: 'ger-26', result: seen({ confidence: 0.4 }) } })).notes).toContain('pc.weakMatch');
  });
});
