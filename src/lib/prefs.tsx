// Per-device display preferences: currency (with live FX rates) and
// language. Exposes money() and t() so every screen formats the same way.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CURRENCIES, type Currency, fetchLiveRates, formatMoney, loadCachedRates, type Rates } from '../utils/currency.ts';
import { detectLang, EN, format, LANGS, loadMessages, LOCALE, type Lang, type MessageKey, type Messages, type Vars } from '../i18n/index.ts';
import { loadJSON, saveJSON } from '../utils/storage.ts';

interface Prefs {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Format a CHF amount in the viewer's currency. */
  money: (chf: number | null | undefined) => string;
  /** Translate a message key; unknown keys fall back to English, then to the key. */
  t: (key: MessageKey | (string & {}), vars?: Vars) => string;
  /** BCP 47 locale for dates and numbers (en-GB, de-CH, fr-CH). */
  locale: string;
  /** Plural: picks `${base}.one` for n = 1, else `${base}.other`; {n} is filled in. */
  tp: (base: string, n: number, vars?: Vars) => string;
  /** Display name for a stored value (catalogue type/league/condition/edition, add-shirt options); unknown values pass through. */
  label: (kind: 'type' | 'league' | 'cond' | 'edition' | 'opt', value: string) => string;
  currencies: readonly Currency[];
  langs: readonly Lang[];
}

const PrefsContext = createContext<Prefs | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() => loadJSON<Currency>('kv_currency', 'CHF'));
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = loadJSON<string | null>('kv_lang', null);
    return (LANGS as readonly string[]).includes(saved ?? '') ? (saved as Lang) : detectLang();
  });
  const [messages, setMessages] = useState<{ lang: Lang; dict: Messages }>({ lang: 'en', dict: EN });
  const [rates, setRates] = useState<Rates>(loadCachedRates);

  useEffect(() => {
    let live = true;
    fetchLiveRates().then((r) => live && setRates(r));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    let live = true;
    loadMessages(lang)
      .then((dict) => live && setMessages({ lang, dict }))
      .catch(() => {}); // offline before the chunk was cached: stay in English
    return () => {
      live = false;
    };
  }, [lang]);

  const setCurrency = useCallback((c: Currency) => {
    saveJSON('kv_currency', c);
    setCurrencyState(c);
  }, []);
  const setLang = useCallback((l: Lang) => {
    saveJSON('kv_lang', l);
    setLangState(l);
  }, []);

  const value = useMemo<Prefs>(
    () => ({
      currency,
      setCurrency,
      lang,
      setLang,
      money: (chf) => formatMoney(chf, currency, rates),
      t: (key, vars) => format(messages.dict, key, vars),
      locale: LOCALE[lang],
      tp: (base, n, vars) => format(messages.dict, base + (n === 1 ? '.one' : '.other'), { n, ...vars }),
      label: (kind, value) => (kind + '.' + value in EN ? format(messages.dict, kind + '.' + value) : value),
      currencies: CURRENCIES,
      langs: LANGS
    }),
    [currency, setCurrency, lang, setLang, rates, messages]
  );
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

// eslint-disable-next-line react/only-export-components
export function usePrefs(): Prefs {
  const p = useContext(PrefsContext);
  if (!p) throw new Error('usePrefs outside PrefsProvider');
  return p;
}
