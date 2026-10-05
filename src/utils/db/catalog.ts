// The catalogue (catalog_shirts) and real-trade market figures per shirt.
import { supabase } from '../supabase.ts';
import type { RpcReturns, Tables } from '../../types/database.ts';

export type CatalogRow = Tables<'catalog_shirts'>;
export type CatalogMarketRow = RpcReturns<'catalog_market'>[number];

export async function loadCatalog(): Promise<CatalogRow[]> {
  const { data, error } = await supabase.from('catalog_shirts').select('*').eq('active', true).order('added_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function loadCatalogMarket(): Promise<CatalogMarketRow[]> {
  const { data, error } = await supabase.rpc('catalog_market');
  if (error) throw error;
  return data || [];
}
