import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { en } from '../i18n/en.ts';
import { de } from '../i18n/de.ts';
import { fr } from '../i18n/fr.ts';
import { detectLang, format } from '../i18n/index.ts';

const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

function sources(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return f === '__tests__' || f === 'i18n' ? [] : sources(p);
    return /\.(tsx?|jsx?)$/.test(f) ? [p] : [];
  });
}

describe('messages', () => {
  it('every language has every key, non-empty, with the same placeholders', () => {
    for (const [name, dict] of [['de', de], ['fr', fr]]) {
      expect(Object.keys(dict).sort(), name).toEqual(Object.keys(en).sort());
      for (const k of Object.keys(en)) {
        expect(dict[k].trim(), `${name}:${k}`).not.toBe('');
        expect(placeholders(dict[k]), `${name}:${k}`).toEqual(placeholders(en[k]));
      }
    }
  });

  it('Swiss German spelling: no ß', () => {
    expect(Object.entries(de).filter(([, v]) => v.includes('ß'))).toEqual([]);
  });

  it('every literal t(...) key used in the app exists', () => {
    const src = join(import.meta.dirname, '..');
    const missing = [];
    for (const file of sources(src)) {
      for (const m of readFileSync(file, 'utf8').matchAll(/\bt\(\s*'([a-zA-Z][\w.]*)'\s*[,)]/g)) if (!(m[1] in en)) missing.push(`${file.slice(src.length)}: ${m[1]}`);
    }
    expect(missing).toEqual([]);
  });

  it('fills placeholders and falls back to English, then to the key', () => {
    expect(format(de, 'common.size', { size: 'L' })).toBe('Grösse L');
    expect(format({}, 'common.size', { size: 'L' })).toBe('Size L');
    expect(format(de, 'no.such.key')).toBe('no.such.key');
  });

  it('detects the browser language', () => {
    expect(detectLang(['fr-CH', 'en'])).toBe('fr');
    expect(detectLang(['de-DE'])).toBe('de');
    expect(detectLang(['it-CH', 'es'])).toBe('en');
  });
});
