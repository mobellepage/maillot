// i18n runtime: English is bundled (source language and fallback); German
// and French load on demand. t(key, { name }) fills {name} placeholders.
import { en, type MessageKey, type Messages } from './en.ts';

export const LANGS = ['en', 'de', 'fr'] as const;
export type Lang = (typeof LANGS)[number];
export type { MessageKey, Messages };

export const LANG_NAMES: Record<Lang, string> = { en: 'English', de: 'Deutsch', fr: 'Français' };

/** Locale for dates and numbers. Swiss variants for de/fr. */
export const LOCALE: Record<Lang, string> = { en: 'en-GB', de: 'de-CH', fr: 'fr-CH' };

export const EN: Messages = en;

export function loadMessages(lang: Lang): Promise<Messages> {
  if (lang === 'de') return import('./de.ts').then((m) => m.de);
  if (lang === 'fr') return import('./fr.ts').then((m) => m.fr);
  return Promise.resolve(en);
}

export type Vars = Record<string, string | number>;

export function format(messages: Messages, key: string, vars?: Vars): string {
  const text = (messages as Record<string, string>)[key] ?? (en as Record<string, string>)[key] ?? key;
  return vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text;
}

/** First supported language the browser prefers, else English. */
export function detectLang(preferred: readonly string[] = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : []): Lang {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0] as Lang;
    if ((LANGS as readonly string[]).includes(base)) return base;
  }
  return 'en';
}
