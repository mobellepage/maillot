// Data API plans shown on /developers. Prices are deliberately not listed
// until they're decided — every plan is "request access" for now.
export const API_BASE = (import.meta.env.VITE_SUPABASE_URL ?? 'https://<project>.supabase.co') + '/functions/v1/price-index';

export const API_PLANS = [
  { name: 'Research', who: 'Journalists, academics, non-commercial projects', features: ['All tracked shirts, daily', 'Per-shirt sales and order book', 'Attribution required'] },
  { name: 'Commercial', who: 'Insurers, auction houses, resellers, apps', features: ['Everything in Research', 'Commercial use, no attribution', 'Higher rate limits', 'Monthly index report in advance'] },
  { name: 'Enterprise', who: 'Custom coverage and delivery', features: ['Bulk history exports', 'Custom segments and SLAs', 'Valuation support for insurance claims'] }
] as const;
