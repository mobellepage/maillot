// Fantasy: fixtures and results for the given matchdays, from the football
// data provider (provider.ts; ESPN unless FANTASY_FOOTBALL_PROVIDER says
// otherwise), into fantasy_fixtures. Called by the game's
// clock (public.fantasy_tick → private.fantasy_request_fixtures, every ten
// minutes) and by admins to resync. Results an admin overrode are left alone.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { providerFor, type Team, type Window } from "./provider.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const PROVIDER = Deno.env.get("FANTASY_FOOTBALL_PROVIDER") ?? "espn";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let ids: number[] = [];
  try {
    const body = await req.json();
    ids = (Array.isArray(body?.matchdays) ? body.matchdays : []).map(Number).filter((n: number) => Number.isInteger(n) && n > 0).slice(0, 6);
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }
  if (!ids.length) return json({ error: "matchdays required" }, 400);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: mds, error: mdErr } = await db.from("fantasy_matchdays").select("id, number, window_start, window_end, international").in("id", ids);
  if (mdErr) return json({ error: mdErr.message }, 500);
  const { data: maps, error: mapErr } = await db.from("fantasy_team_mappings").select("club_id, provider_team_id, team_name, kit_clubs(name, league)").eq("provider", PROVIDER);
  if (mapErr) return json({ error: mapErr.message }, 500);
  const teams: Team[] = (maps ?? []).map((m) => {
    const club = (Array.isArray(m.kit_clubs) ? m.kit_clubs[0] : m.kit_clubs) as { name: string; league: string } | null;
    return { clubId: m.club_id, providerTeamId: m.provider_team_id, name: m.team_name ?? club?.name ?? m.club_id, league: club?.league ?? "", national: club?.league === "National Teams" };
  });
  let provider;
  try {
    provider = providerFor(PROVIDER);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }

  let written = 0;
  for (const md of mds ?? []) {
    const w: Window = { matchdayId: md.id, number: md.number, start: new Date(md.window_start), end: new Date(md.window_end), international: md.international };
    let fixtures;
    try {
      fixtures = await provider.getLiveScores(w, teams);
    } catch (e) {
      return json({ error: (e as Error).message, matchday: md.id }, 502);
    }
    const { data: overridden } = await db.from("fantasy_fixtures").select("provider_fixture_id").eq("matchday_id", md.id).eq("overridden", true);
    const keep = new Set((overridden ?? []).map((o) => o.provider_fixture_id));
    const rows = fixtures
      .filter((f) => !keep.has(f.providerFixtureId))
      .map((f) => ({
        matchday_id: md.id,
        provider: PROVIDER,
        provider_fixture_id: f.providerFixtureId,
        competition: f.competition,
        home_club_id: f.home.clubId || null,
        away_club_id: f.away.clubId || null,
        home_name: f.home.name,
        away_name: f.away.name,
        kickoff: f.kickoff.toISOString(),
        status: f.status,
        home_goals: f.homeGoals,
        away_goals: f.awayGoals,
        updated_at: new Date().toISOString()
      }));
    if (rows.length) {
      const { error } = await db.from("fantasy_fixtures").upsert(rows, { onConflict: "provider,provider_fixture_id" });
      if (error) return json({ error: error.message }, 500);
      written += rows.length;
    }
  }
  return json({ provider: PROVIDER, matchdays: (mds ?? []).length, fixtures: written, teams: teams.length, error: (provider as { lastError?: string | null }).lastError ?? null });
});
