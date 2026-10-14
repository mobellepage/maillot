// The catalogue (catalog_shirts) and real-trade market figures per shirt.
import { sb } from '../supabase.ts';
import type { RpcReturns, Tables } from '../../types/database.ts';

export type CatalogRow = Tables<'catalog_shirts'>;
export type CatalogMarketRow = RpcReturns<'catalog_market'>[number];

export async function loadCatalog(): Promise<CatalogRow[]> {
  // Through a throttled function: the tables can't be read directly (bulk copying).
  const { data, error } = await (await sb()).rpc('public_catalog');
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
  const { data, error } = await (await sb()).rpc('public_valuations');
  if (error) throw error;
  return data || [];
}

/** The comparables behind a shirt's value: this exact shirt first, then the newest. */
export async function loadComps(shirtId: string): Promise<CompRow[]> {
  const { data, error } = await (await sb()).rpc('shirt_comps', { p_shirt: shirtId });
  if (error) throw error;
  return data || [];
}

/** Daily market values of the given shirts since `days` ago (for collection moves). */
export async function loadValueHistory(shirtIds: string[], days = 35): Promise<Tables<'shirt_value_history'>[]> {
  if (!shirtIds.length) return [];
  // Visitors get about a month, members about a year (value_history caps it).
  const { data, error } = await (await sb()).rpc('value_history', { p_ids: shirtIds, p_days: days });
  if (error) throw error;
  return data || [];
}
