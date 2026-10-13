import { describe, expect, it } from 'vitest';
import { claimText, normalizeCheck } from '../../supabase/functions/authenticity-check/check.ts';
import { withAiCheck } from '../features/vault/addshirt/precheck.ts';

describe('normalizeCheck', () => {
  it('keeps a clean answer', () => {
    const r = normalizeCheck({ verdict: 'no_issues', reasons: ['Label layout fits adidas 2026'], product_code: 'JN1234', code_fits: 'yes', photo_issues: [], summary: 'Home shirt.' });
    expect(r).toMatchObject({ verdict: 'no_issues', productCode: 'JN1234', codeFits: 'yes', reasons: ['Label layout fits adidas 2026'] });
  });
  it('never calls a shirt clean on unreadable photos', () => {
    expect(normalizeCheck({ verdict: 'no_issues', reasons: [], photo_issues: ['label_unreadable', 'whatever'] })).toMatchObject({ verdict: 'please_check', photoIssues: ['label_unreadable'] });
  });
  it('turns anything unexpected into "please check"', () => {
    expect(normalizeCheck(null).verdict).toBe('please_check');
    expect(normalizeCheck({ verdict: 'genuine', product_code: 'unknown' })).toMatchObject({ verdict: 'please_check', productCode: null, codeFits: 'unknown' });
  });
});

describe('claimText', () => {
  it('lists what the member says', () => {
    expect(claimText({ shirt: 'FC Basel 2025/26 Home', version: 'Fan-Replica', print: 'Xhaka 10', patches: [] })).toContain('Print (name and number): Xhaka 10');
  });
});

describe('withAiCheck', () => {
  const local = { status: 'review', notes: ['pc.codeUnreadable', 'pc.noText'] };
  const ai = (o) => ({ verdict: 'no_issues', reasons: [], productCode: 'JN1234', codeFits: 'yes', photoIssues: [], summary: '', ...o });
  it('leaves the local check alone when the AI did not run', () => {
    expect(withAiCheck(local, null)).toBe(local);
  });
  it('drops label notes once the AI read the label', () => {
    expect(withAiCheck(local, ai({}))).toEqual({ status: 'ok', notes: ['pc.clean'], reasons: [], productCode: 'JN1234' });
  });
  it('the stricter verdict wins and keeps the reasons', () => {
    const r = withAiCheck({ status: 'ok', notes: ['pc.clean'] }, ai({ verdict: 'possible_fake', reasons: ['Crest stitching is flat'], codeFits: 'no' }));
    expect(r).toMatchObject({ status: 'fake', notes: ['pc.codeMismatch'], reasons: ['Crest stitching is flat'] });
  });
});
