// Per-device display preferences: currency (with live FX rates) and
// language. Exposes money() and t() so every screen formats the same way.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CURRENCIES, type Currency, fetchLiveRates, formatMoney, loadCachedRates, type Rates } from '../utils/currency.ts';
import { LANGS, type Lang, translate } from '../utils/i18n.ts';
import { loadJSON, saveJSON } from '../utils/storage.ts';

interface Prefs {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Format a CHF amount in the viewer's currency. */
  money: (chf: number | null | undefined) => string;
  t: (key: string) => string;
  currencies: readonly Currency[];
  langs: readonly Lang[];
}

const PrefsContext = createContext<Prefs | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() => loadJSON<Currency>('kv_currency', 'CHF'));
  const [lang, setLangState] = useState<Lang>(() => loadJSON<Lang>('kv_lang', 'en'));
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
      t: (key) => translate(lang, key),
      currencies: CURRENCIES,
      langs: LANGS
    }),
    [currency, setCurrency, lang, setLang, rates]
  );
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

// eslint-disable-next-line react/only-export-components
export function usePrefs(): Prefs {
  const p = useContext(PrefsContext);
  if (!p) throw new Error('usePrefs outside PrefsProvider');
  return p;
}
