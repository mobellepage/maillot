// The catalogue (catalog_shirts) and real-trade market figures per shirt.
import { sb } from '../supabase.ts';
import type { RpcReturns, Tables } from '../../types/database.ts';

export type CatalogRow = Tables<'catalog_shirts'>;
export type CatalogMarketRow = RpcReturns<'catalog_market'>[number];

export async function loadCatalog(): Promise<CatalogRow[]> {
  const { data, error } = await (await sb()).from('catalog_shirts').select('*').eq('active', true).order('added_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function loadCatalogMarket(): Promise<CatalogMarketRow[]> {
  const { data, error } = await (await sb()).rpc('catalog_market');
  if (error) throw error;
  return data || [];
}

export type ValuationRow = Tables<'shirt_valuations'>;
export type CompRow = Pick<Tables<'market_comps'>, 'source' | 'external_id' | 'marketplace' | 'kind' | 'match' | 'edition' | 'condition' | 'title' | 'url' | 'price' | 'currency' | 'price_chf' | 'seen_at' | 'sold_at'>;

/** Market values from the valuation model, one per catalogue shirt. */
export async function loadValuations(): Promise<ValuationRow[]> {
  const { data, error } = await (await sb()).from('shirt_valuations').select('*');
  if (error) throw error;
  return data || [];
}

/** The comparables behind a shirt's value: this exact shirt first, then the newest. */
export async function loadComps(shirtId: string): Promise<CompRow[]> {
  const since = new Date(Date.now() - 14 * 864e5).toISOString();
  const { data, error } = await (await sb())
    .from('market_comps')
    .select('source, external_id, marketplace, kind, match, edition, condition, title, url, price, currency, price_chf, seen_at, sold_at')
    .eq('catalog_id', shirtId)
    .gte('seen_at', since)
    .order('match', { ascending: true })
    .order('seen_at', { ascending: false })
    .limit(12);
  if (error) throw error;
  return data || [];
}
