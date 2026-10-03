// Multi-currency display support. Every price in the data layer (data.js,
// Supabase orders/asks/bids) is stored in CHF, the app's base currency; this
// module only converts + formats for display, so no schema/data changes were
// needed elsewhere. Rates are fetched live from Frankfurter.app (ECB
// reference rates, public, no API key required) and cached in localStorage
// for a few hours; if the fetch fails (offline, blocked, etc.) we fall back
// to the approximate static rates below so price displays never break.
export const CURRENCIES = ['CHF', 'EUR', 'USD', 'GBP'];

const FALLBACK_RATES = { CHF: 1, EUR: 1.05, USD: 1.13, GBP: 0.95 };

const FORMAT = {
  CHF: (n) => 'CHF\u00a0' + n.toLocaleString('de-CH'),
  EUR: (n) => '\u20ac\u00a0' + n.toLocaleString('de-CH'),
  USD: (n) => '$' + n.toLocaleString('en-US'),
  GBP: (n) => '\u00a3' + n.toLocaleString('en-GB')
};

const RATES_CACHE_KEY = 'kv_fx_rates_v1';
const RATES_TTL = 6 * 60 * 60 * 1000;

export function loadCachedRates() {
  try {
    const raw = localStorage.getItem(RATES_CACHE_KEY);
    if (!raw) return FALLBACK_RATES;
    const { rates, at } = JSON.parse(raw);
    if (!rates || Date.now() - at > RATES_TTL) return FALLBACK_RATES;
    return { ...FALLBACK_RATES, ...rates };
  } catch (e) {
    return FALLBACK_RATES;
  }
}

export async function fetchLiveRates() {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=CHF&to=EUR,USD,GBP');
    if (!res.ok) throw new Error('fx fetch failed');
    const data = await res.json();
    const rates = { CHF: 1, ...data.rates };
    localStorage.setItem(RATES_CACHE_KEY, JSON.stringify({ rates, at: Date.now() }));
    return rates;
  } catch (e) {
    return loadCachedRates();
  }
}

export function formatMoney(chfAmount, code, rates) {
  const rate = (rates && rates[code]) || FALLBACK_RATES[code] || 1;
  const n = Math.round((chfAmount || 0) * rate);
  return (FORMAT[code] || FORMAT.CHF)(n);
}
