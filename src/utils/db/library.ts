// The kit library: clubs, their kits by season, members' suggestions and
// the admin queue / import.
import { sb } from '../supabase.ts';
import type { Json, RpcReturns, Tables } from '../../types/database.ts';

export type KitClub = Tables<'kit_clubs'>;
export type Kit = Tables<'kits'>;

export async function loadKitClubs(): Promise<KitClub[]> {
  const { data, error } = await (await sb()).rpc('library_clubs');
  if (error) throw error;
  return data || [];
}

/** How many kits each club has in the library. */
export async function loadKitCounts(): Promise<Record<string, number>> {
  const { data, error } = await (await sb()).rpc('library_kit_counts');
  if (error) throw error;
  return Object.fromEntries((data || []).map((r) => [r.club_id, r.n]));
}

export async function loadClubKits(clubId: string): Promise<Kit[]> {
  const { data, error } = await (await sb()).rpc('library_kits', { p_club: clubId });
  if (error) throw error;
  return data || [];
}

/** A member who has a library kit in their (shown) collection. */
export interface KitOwner {
  kit_id: string;
  item_id: string;
  handle: string;
  avatar: string | null;
  visibility: string;
  size: string | null;
  /** An offer or an inquiry is possible (the owner allows it). */
  can_ask: boolean;
}

export async function loadKitOwners(clubId: string): Promise<KitOwner[]> {
  const { data, error } = await (await sb()).rpc('library_kit_owners', { p_club: clubId });
  if (error) throw error;
  return data || [];
}

/** Saves (or with null clears) the member's favourite team. */
export async function setFavoriteClub(clubId: string | null): Promise<void> {
  const { error } = await (await sb()).rpc('set_favorite_club', { p_club: clubId });
  if (error) throw error;
}

/** The kits of a club the signed-in member has in their collection. */
export async function loadMyClubKits(clubId: string): Promise<{ kit_id: string; item_id: string }[]> {
  const { data, error } = await (await sb()).rpc('my_club_kits', { p_club: clubId });
  if (error) throw error;
  return data || [];
}

/** One hit of the home-page search across the library. */
export interface KitHit {
  id: string;
  club_id: string;
  club_name: string;
  season: string;
  kind: string;
  variant: string;
  image_path: string | null;
  colors: string[];
}

export async function searchLibrary(q: { club: string; year: number | null; season: string | null; kind: string | null }): Promise<KitHit[]> {
  const { data, error } = await (await sb()).rpc('library_search', { p_club: q.club, p_year: q.year, p_season: q.season, p_kind: q.kind });
  if (error) throw error;
  return data || [];
}

export interface KitSuggestion {
  club: string;
  season: string;
  kind: string;
  brand: string;
  sponsor: string;
  pattern: string;
  colors: string[];
  note: string;
}

export async function suggestKit(k: KitSuggestion): Promise<void> {
  const { error } = await (await sb()).rpc('suggest_kit', { p_club: k.club, p_season: k.season, p_kind: k.kind, p_brand: k.brand, p_sponsor: k.sponsor, p_pattern: k.pattern, p_colors: k.colors, p_note: k.note });
  if (error) throw error;
}

export type KitSuggestionRow = RpcReturns<'list_kit_suggestions_for_admin'>[number];

export async function loadKitSuggestions(): Promise<KitSuggestionRow[]> {
  const { data, error } = await (await sb()).rpc('list_kit_suggestions_for_admin');
  if (error) throw error;
  return data || [];
}

export async function reviewKit(id: string, approve: boolean): Promise<void> {
  const { error } = await (await sb()).rpc('admin_review_kit', { p_id: id, p_approve: approve });
  if (error) throw error;
}

export async function importKits(kits: Json): Promise<number> {
  const { data, error } = await (await sb()).rpc('admin_import_kits', { p_kits: kits });
  if (error) throw error;
  return data ?? 0;
}

/** A kit tile on Discover (popular today, eras, legends). */
export interface KitTile {
  id: string;
  club_id: string;
  club_name: string;
  season: string;
  kind: string;
  variant: string;
  image_path: string | null;
  season_year?: number;
  league?: string;
}

export async function loadPopularKits(limit = 3): Promise<KitTile[]> {
  const { data, error } = await (await sb()).rpc('popular_kits', { p_limit: limit });
  if (error) throw error;
  return data || [];
}

export async function loadEraKits(decade: number, league: string | null, offset = 0, limit = 48): Promise<KitTile[]> {
  const { data, error } = await (await sb()).rpc('era_kits', { p_decade: decade, p_league: league, p_offset: offset, p_limit: limit });
  if (error) throw error;
  return data || [];
}

export async function loadLegendKits(legend: string): Promise<KitTile[]> {
  const { data, error } = await (await sb()).rpc('legend_kits_for', { p_legend: legend });
  if (error) throw error;
  return data || [];
}

/** Kit news (headline and link from the source, matched to a library kit when we have it). */
export interface NewsItem {
  id: string;
  source: string;
  url: string;
  title: string;
  published_on: string;
  /** The title picture, in our news-images bucket. */
  image_path: string | null;
  club_id: string | null;
  club_name: string | null;
  kit_season: string | null;
  kit_image: string | null;
}

export async function loadNews(limit = 5): Promise<NewsItem[]> {
  const { data, error } = await (await sb()).rpc('latest_news', { p_limit: limit });
  if (error) throw error;
  return data || [];
}
