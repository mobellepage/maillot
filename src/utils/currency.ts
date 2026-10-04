// Multi-currency display. Every price in the data layer (catalogue, Supabase
// orders/asks/bids) is stored in CHF, the base currency; this module only
// converts and formats for display. Rates come live from Frankfurter (ECB
// reference rates, public, no key) and are cached in localStorage for a few
// hours; if the fetch fails we fall back to the static rates below so prices
// always render.
export const CURRENCIES = ['CHF', 'EUR', 'USD', 'GBP'] as const;
export type Currency = (typeof CURRENCIES)[number];
export type Rates = Record<Currency, number>;

// Approximate ECB rates (Oct 2026), only used until/unless the live fetch lands.
export const FALLBACK_RATES: Rates = { CHF: 1, EUR: 1.08, USD: 1.21, GBP: 0.92 };

const FORMAT: Record<Currency, (n: number) => string> = {
  CHF: (n) => 'CHF ' + n.toLocaleString('de-CH'),
  EUR: (n) => '€ ' + n.toLocaleString('de-CH'),
  USD: (n) => '$' + n.toLocaleString('en-US'),
  GBP: (n) => '£' + n.toLocaleString('en-GB')
};

const RATES_URL = 'https://api.frankfurter.dev/v1/latest?base=CHF&symbols=EUR,USD,GBP';
const RATES_CACHE_KEY = 'kv_fx_rates_v2';
const RATES_TTL = 6 * 60 * 60 * 1000;

function isCurrency(code: string): code is Currency {
  return (CURRENCIES as readonly string[]).includes(code);
}

export function loadCachedRates(): Rates {
  try {
    const raw = localStorage.getItem(RATES_CACHE_KEY);
    if (!raw) return FALLBACK_RATES;
    const { rates, at } = JSON.parse(raw) as { rates?: Partial<Rates>; at?: number };
    if (!rates || !at || Date.now() - at > RATES_TTL) return FALLBACK_RATES;
    return { ...FALLBACK_RATES, ...rates };
  } catch {
    return FALLBACK_RATES;
  }
}

export async function fetchLiveRates(): Promise<Rates> {
  try {
    const res = await fetch(RATES_URL);
    if (!res.ok) throw new Error('fx fetch failed: ' + res.status);
    const data = (await res.json()) as { rates?: Partial<Rates> };
    const rates: Rates = { ...FALLBACK_RATES, ...data.rates, CHF: 1 };
    localStorage.setItem(RATES_CACHE_KEY, JSON.stringify({ rates, at: Date.now() }));
    return rates;
  } catch {
    return loadCachedRates();
  }
}

export function formatMoney(chfAmount: number | null | undefined, code: string, rates?: Partial<Rates> | null): string {
  const cur: Currency = isCurrency(code) ? code : 'CHF';
  const rate = (rates && rates[cur]) || FALLBACK_RATES[cur];
  const n = Math.round((chfAmount || 0) * rate);
  return FORMAT[cur](n);
}
