// Fantasy: the player's state, packs, cards, Kit Points and missions. The
// game runs in the database; the app only asks and reports.
import { sb } from '../supabase.ts';
import type { RpcReturns } from '../../types/database.ts';

export type FantasyState = RpcReturns<'fantasy_state'>[number];
export type FantasyMission = { key: string; points: number; how: 'server' | 'client'; done: boolean };
export type PackCard = RpcReturns<'fantasy_open_pack'>[number];
export type FantasyCard = RpcReturns<'fantasy_my_cards'>[number];
export type GoldTodo = RpcReturns<'fantasy_gold_todo'>[number];
export type FantasyOdds = RpcReturns<'fantasy_odds'>[number];

export async function loadFantasyState(): Promise<FantasyState> {
  const { data, error } = await (await sb()).rpc('fantasy_state');
  if (error) throw error;
  const row = data?.[0];
  if (!row) throw new Error('no state');
  return row;
}

/** Opens a pack (an extra one, paid with Kit Points, when `extra`). Errors: P0460 daily limit, P0461 not enough points, P0462 no pack. */
export async function openFantasyPack(extra = false): Promise<PackCard[]> {
  const { data, error } = await (await sb()).rpc('fantasy_open_pack', { p_extra: extra });
  if (error) throw error;
  return data ?? [];
}

/** Duplicates (all, or one kit's) become Kit Points; returns how many. */
export async function convertFantasyDuplicates(kitId?: string): Promise<number> {
  const { data, error } = await (await sb()).rpc('fantasy_convert_duplicates', { p_kit: kitId ?? null });
  if (error) throw error;
  return data ?? 0;
}

/** The app noticed a mission being done (a value checked, a club page opened …). */
export async function fantasyEvent(key: string): Promise<number> {
  const { data, error } = await (await sb()).rpc('fantasy_event', { p_key: key });
  if (error) throw error;
  return data ?? 0;
}

export async function loadFantasyCards(): Promise<FantasyCard[]> {
  const { data, error } = await (await sb()).rpc('fantasy_my_cards');
  if (error) throw error;
  return data ?? [];
}

export async function loadGoldTodo(): Promise<GoldTodo[]> {
  const { data, error } = await (await sb()).rpc('fantasy_gold_todo');
  if (error) throw error;
  return data ?? [];
}

export async function loadFantasyOdds(): Promise<FantasyOdds[]> {
  const { data, error } = await (await sb()).rpc('fantasy_odds');
  if (error) throw error;
  return data ?? [];
}

// ---- Phase 2: albums and the weekly shop ----------------------------------
export type FantasyAlbum = RpcReturns<'fantasy_albums'>[number];
export type AlbumSlot = RpcReturns<'fantasy_album'>[number];
export type ShopKit = RpcReturns<'fantasy_shop'>[number];

export async function loadFantasyAlbums(): Promise<FantasyAlbum[]> {
  const { data, error } = await (await sb()).rpc('fantasy_albums');
  if (error) throw error;
  return data ?? [];
}

export async function loadFantasyAlbum(slug: string): Promise<AlbumSlot[]> {
  const { data, error } = await (await sb()).rpc('fantasy_album', { p_slug: slug });
  if (error) throw error;
  return data ?? [];
}

export async function loadFantasyShop(): Promise<ShopKit[]> {
  const { data, error } = await (await sb()).rpc('fantasy_shop');
  if (error) throw error;
  return data ?? [];
}

/** Buys this week's card with Kit Points; returns the price. Errors: P0461 points, P0463 not in shop, P0464 already bought. */
export async function buyFantasyCard(kitId: string): Promise<number> {
  const { data, error } = await (await sb()).rpc('fantasy_buy_card', { p_kit: kitId });
  if (error) throw error;
  return data ?? 0;
}

// ---- Phase 3: Matchday ------------------------------------------------------
export type Matchday = RpcReturns<'fantasy_matchday'>[number];
export type MatchdayLineup = { kits: string[]; golds: boolean[]; captain: string; chip: string | null; pred_fixture: number | null; pred_home: number | null; pred_away: number | null; budget_used: number; points: number; pred_points: number; locked: boolean; carried: boolean };
export type Fixture = RpcReturns<'fantasy_fixtures'>[number];
export type SquadCard = RpcReturns<'fantasy_squad_cards'>[number];
export type LineupCard = RpcReturns<'fantasy_lineup_cards'>[number];
export type MatchdayRow = RpcReturns<'fantasy_matchday_table'>[number];

export async function loadMatchday(id?: number): Promise<Matchday | null> {
  const { data, error } = await (await sb()).rpc('fantasy_matchday', { p_md: id ?? null });
  if (error) throw error;
  return data?.[0] ?? null;
}
export async function loadFixtures(md: number): Promise<Fixture[]> {
  const { data, error } = await (await sb()).rpc('fantasy_fixtures', { p_md: md });
  if (error) throw error;
  return data ?? [];
}
export async function loadSquadCards(md: number): Promise<SquadCard[]> {
  const { data, error } = await (await sb()).rpc('fantasy_squad_cards', { p_md: md });
  if (error) throw error;
  return data ?? [];
}
export async function loadLineupCards(md: number, user?: string): Promise<LineupCard[]> {
  const { data, error } = await (await sb()).rpc('fantasy_lineup_cards', { p_md: md, p_user: user ?? null });
  if (error) throw error;
  return data ?? [];
}
export async function loadMatchdayTable(md: number, limit = 50): Promise<MatchdayRow[]> {
  const { data, error } = await (await sb()).rpc('fantasy_matchday_table', { p_md: md, p_limit: limit });
  if (error) throw error;
  return data ?? [];
}
/** Errors: P0470 deadline passed, P0471 size, P0472 captain, P0473 not owned, P0474 over budget, P0475 chip used, P0476 prediction fixture. */
export async function saveLineup(md: number, kits: string[], captain: string, chip: string | null, pred: { fixture: number; home: number; away: number } | null): Promise<void> {
  const { error } = await (await sb()).rpc('fantasy_save_lineup', { p_md: md, p_kits: kits, p_captain: captain, p_chip: chip, p_pred_fixture: pred?.fixture ?? null, p_pred_home: pred?.home ?? null, p_pred_away: pred?.away ?? null });
  if (error) throw error;
}

// ---- Phases 4 & 5: leagues, cups, divisions, season ---------------------------
export type MyLeague = RpcReturns<'fantasy_my_leagues'>[number];
export type League = RpcReturns<'fantasy_league'>[number];
export type StandingRow = RpcReturns<'fantasy_table'>[number];
export type LeagueMember = RpcReturns<'fantasy_league_members'>[number];
export type Pairing = RpcReturns<'fantasy_league_pairings'>[number];
export type LeaguePost = RpcReturns<'fantasy_league_posts'>[number];
export type PublicLeague = RpcReturns<'fantasy_public_leagues'>[number];
export type MyStanding = RpcReturns<'fantasy_my_standing'>[number];

export async function loadMyLeagues(): Promise<MyLeague[]> {
  const { data, error } = await (await sb()).rpc('fantasy_my_leagues');
  if (error) throw error;
  return data ?? [];
}
export async function loadLeague(id: string): Promise<League | null> {
  const { data, error } = await (await sb()).rpc('fantasy_league', { p_id: id });
  if (error) throw error;
  return data?.[0] ?? null;
}
export async function loadTable(scope: 'league' | 'division' | 'overall' | 'season', scopeId: string, period: string, limit = 100): Promise<StandingRow[]> {
  const { data, error } = await (await sb()).rpc('fantasy_table', { p_scope: scope, p_scope_id: scopeId, p_period: period, p_limit: limit });
  if (error) throw error;
  return data ?? [];
}
export async function loadLeagueMembers(id: string): Promise<LeagueMember[]> {
  const { data, error } = await (await sb()).rpc('fantasy_league_members', { p_id: id });
  if (error) throw error;
  return data ?? [];
}
export async function loadPairings(id: string, md: number): Promise<Pairing[]> {
  const { data, error } = await (await sb()).rpc('fantasy_league_pairings', { p_id: id, p_md: md });
  if (error) throw error;
  return data ?? [];
}
export async function loadLeaguePosts(id: string): Promise<LeaguePost[]> {
  const { data, error } = await (await sb()).rpc('fantasy_league_posts', { p_id: id, p_limit: 50 });
  if (error) throw error;
  return data ?? [];
}
export async function loadPublicLeagues(): Promise<PublicLeague[]> {
  const { data, error } = await (await sb()).rpc('fantasy_public_leagues', { p_limit: 30 });
  if (error) throw error;
  return data ?? [];
}
export async function loadMyStanding(): Promise<MyStanding | null> {
  const { data, error } = await (await sb()).rpc('fantasy_my_standing');
  if (error) throw error;
  return data?.[0] ?? null;
}
export async function createLeague(name: string, format: 'classic' | 'h2h', isPublic: boolean): Promise<string> {
  const { data, error } = await (await sb()).rpc('fantasy_create_league', { p_name: name, p_format: format, p_public: isPublic });
  if (error) throw error;
  return data as string;
}
/** Errors: P0481 not found, P0482 full. */
export async function joinLeague(code: string): Promise<string> {
  const { data, error } = await (await sb()).rpc('fantasy_join_league', { p_code: code });
  if (error) throw error;
  return data as string;
}
export async function leaveLeague(id: string): Promise<void> {
  const { error } = await (await sb()).rpc('fantasy_leave_league', { p_league: id });
  if (error) throw error;
}
export async function postInLeague(id: string, body: string): Promise<void> {
  const { error } = await (await sb()).rpc('fantasy_league_post', { p_league: id, p_body: body });
  if (error) throw error;
}
export async function reportLeaguePost(postId: number): Promise<void> {
  const { error } = await (await sb()).rpc('fantasy_report_post', { p_post: postId });
  if (error) throw error;
}
