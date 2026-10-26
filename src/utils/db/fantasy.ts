// Fantasy: the squad game. The game runs in the database; the app only
// asks and reports. Jerseys (clubs with their current kit), the squad of
// eight, the Gameweek line-up, chips, prices — then leagues.
import { sb } from '../supabase.ts';
import type { RpcReturns } from '../../types/database.ts';

export type Matchday = RpcReturns<'fantasy_matchday'>[number];
/** The squad as the matchday RPC carries it (null before the first build). */
export type SquadState = { clubs: string[]; bank: number; locked_clubs: string[]; bank_locked: number; free_transfers: number; first_locked: boolean; value: number };
export type MatchdayLineup = { clubs: string[]; starters: string[]; bench: string[]; captain: string | null; chip: string | null; transfers: number; hits: number; points: number; locked: boolean; carried: boolean };
export type Fixture = RpcReturns<'fantasy_fixtures'>[number];
export type Jersey = RpcReturns<'fantasy_jerseys'>[number];
export type SquadClub = RpcReturns<'fantasy_squad_clubs'>[number];
export type LineupClub = RpcReturns<'fantasy_lineup_clubs'>[number];
export type MatchdayRow = RpcReturns<'fantasy_matchday_table'>[number];
export type PriceMove = RpcReturns<'fantasy_price_moves'>[number];

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
/** Every jersey one can buy for the Gameweek (nations only in international ones). */
export async function loadJerseys(md?: number): Promise<Jersey[]> {
  const { data, error } = await (await sb()).rpc('fantasy_jerseys', { p_md: md ?? null });
  if (error) throw error;
  return data ?? [];
}
/** My squad's eight clubs with the Gameweek's line-up flags. */
export async function loadSquadClubs(md?: number): Promise<SquadClub[]> {
  const { data, error } = await (await sb()).rpc('fantasy_squad_clubs', { p_md: md ?? null });
  if (error) throw error;
  return data ?? [];
}
export async function loadLineupClubs(md: number, user?: string): Promise<LineupClub[]> {
  const { data, error } = await (await sb()).rpc('fantasy_lineup_clubs', { p_md: md, p_user: user ?? null });
  if (error) throw error;
  return data ?? [];
}
export async function loadMatchdayTable(md: number, limit = 50): Promise<MatchdayRow[]> {
  const { data, error } = await (await sb()).rpc('fantasy_matchday_table', { p_md: md, p_limit: limit });
  if (error) throw error;
  return data ?? [];
}
export type MatchdayStats = RpcReturns<'fantasy_matchday_stats'>[number];
/** The Gameweek's average and highest score (locked line-ups). */
export async function loadMatchdayStats(md: number): Promise<MatchdayStats | null> {
  const { data, error } = await (await sb()).rpc('fantasy_matchday_stats', { p_md: md });
  if (error) throw error;
  return data?.[0] ?? null;
}
export type ClubStat = RpcReturns<'fantasy_club_stats'>[number];
/** Every jersey with its club's season so far (points as Fantasy counts them). */
export async function loadClubStats(): Promise<ClubStat[]> {
  const { data, error } = await (await sb()).rpc('fantasy_club_stats');
  if (error) throw error;
  return data ?? [];
}
export async function loadPriceMoves(limit = 10): Promise<PriceMove[]> {
  const { data, error } = await (await sb()).rpc('fantasy_price_moves', { p_limit: limit });
  if (error) throw error;
  return data ?? [];
}
/** The squad of eight (first build or transfers). Errors: P0470 deadline, P0471 size, P0473 not pickable, P0474 over budget, P0477 league limit, P0478 nation not playing. */
export async function saveSquad(clubs: string[], md: number): Promise<void> {
  const { error } = await (await sb()).rpc('fantasy_save_squad', { p_clubs: clubs, p_md: md });
  if (error) throw error;
}
/** Five starters and the captain. Errors: P0470 deadline, P0471 size, P0472 captain not owned, P0478 nation not playing, P0479 no squad. */
export async function saveLineup(md: number, starters: string[], captain: string | null, bench?: string[]): Promise<void> {
  const { error } = await (await sb()).rpc('fantasy_save_lineup', { p_md: md, p_starters: starters, p_captain: captain, ...(bench ? { p_bench: bench } : {}) });
  if (error) throw error;
}
/** A chip for the Gameweek, or none. Errors: P0475 used, P0476 locked by transfers, P0479 no squad. */
export async function playChip(md: number, chip: string | null): Promise<void> {
  const { error } = await (await sb()).rpc('fantasy_play_chip', { p_md: md, p_chip: chip });
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

// ---- Profile and admin -------------------------------------
export type FantasyProfile = RpcReturns<'fantasy_public_profile'>[number];
export type AdminMatchday = RpcReturns<'fantasy_admin_matchdays'>[number];

export async function loadFantasyProfile(handle: string): Promise<FantasyProfile | null> {
  const { data, error } = await (await sb()).rpc('fantasy_public_profile', { p_handle: handle });
  if (error) throw error;
  return data?.[0] ?? null;
}
// Admin
export async function adminMatchdays(): Promise<AdminMatchday[]> {
  const { data, error } = await (await sb()).rpc('fantasy_admin_matchdays');
  if (error) throw error;
  return data ?? [];
}
export async function adminSetFixture(id: number, home: number, away: number, status = 'finished'): Promise<void> {
  const { error } = await (await sb()).rpc('fantasy_admin_fixture', { p_id: id, p_home: home, p_away: away, p_status: status });
  if (error) throw error;
}
export async function adminRescore(md: number): Promise<void> {
  const { error } = await (await sb()).rpc('fantasy_rescore', { p_md: md });
  if (error) throw error;
}
export type ClubPrice = { club_id: string; price: number; base_price: number; club_name?: string; league?: string };
export async function adminClubPrices(): Promise<ClubPrice[]> {
  const { data, error } = await (await sb()).from('fantasy_club_prices').select('club_id, price, base_price, kit_clubs(name, league)').order('price', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((m) => {
    const c = (Array.isArray(m.kit_clubs) ? m.kit_clubs[0] : m.kit_clubs) as { name: string; league: string } | null;
    return { club_id: m.club_id, price: Number(m.price), base_price: Number(m.base_price), club_name: c?.name, league: c?.league };
  });
}
export async function adminSetPrice(clubId: string, price: number): Promise<void> {
  const { error } = await (await sb()).rpc('fantasy_admin_set_price', { p_club: clubId, p_price: price });
  if (error) throw error;
}

export type TeamMapping = { club_id: string; provider: string; provider_team_id: string; team_name: string | null; club_name?: string; league?: string };
export async function adminTeamMappings(): Promise<TeamMapping[]> {
  const { data, error } = await (await sb()).from('fantasy_team_mappings').select('club_id, provider, provider_team_id, team_name, kit_clubs(name, league)').order('club_id');
  if (error) throw error;
  return (data ?? []).map((m) => {
    const c = (Array.isArray(m.kit_clubs) ? m.kit_clubs[0] : m.kit_clubs) as { name: string; league: string } | null;
    return { club_id: m.club_id, provider: m.provider, provider_team_id: m.provider_team_id, team_name: m.team_name, club_name: c?.name, league: c?.league };
  });
}
export async function adminSetTeamMapping(clubId: string, provider: string, providerTeamId: string): Promise<void> {
  const { error } = await (await sb()).from('fantasy_team_mappings').upsert({ club_id: clubId, provider, provider_team_id: providerTeamId }, { onConflict: 'club_id' });
  if (error) throw error;
}
