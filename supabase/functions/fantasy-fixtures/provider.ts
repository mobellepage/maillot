// The football data behind Fantasy's Matchday, behind one interface so the
// source can be swapped. Two providers: a mock (default) that makes
// believable fixtures and results for the clubs the game knows, and
// football-data.org (set FANTASY_FOOTBALL_PROVIDER=football-data and
// FOOTBALL_DATA_API_KEY; map clubs to its team ids in Admin → Fantasy).

export interface Team {
  /** The library club (kit_clubs.id) the provider team maps to. */
  clubId: string;
  providerTeamId: string;
  name: string;
  league: string;
  national: boolean;
}

export interface Window {
  matchdayId: number;
  number: number;
  start: Date;
  end: Date;
  international: boolean;
}

export interface Fixture {
  providerFixtureId: string;
  competition: "league" | "cup" | "european" | "international";
  home: Team;
  away: Team;
  kickoff: Date;
  status: "scheduled" | "live" | "finished";
  homeGoals: number | null;
  awayGoals: number | null;
}

export interface FootballDataProvider {
  getFixtures(window: Window, teams: Team[]): Promise<Fixture[]>;
  getResults(window: Window, teams: Team[]): Promise<Fixture[]>;
  getLiveScores(window: Window, teams: Team[]): Promise<Fixture[]>;
}

// --- Mock ------------------------------------------------------------------
// Deterministic from the matchday number, so every call agrees: teams of a
// league are shuffled and paired, kick-offs spread over the weekend, scores
// drawn from a Poisson-ish distribution once the match has been played.
// Clubs play in league windows, nations in international ones.
function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function poisson(lambda: number, r: () => number) {
  let k = 0;
  let p = Math.exp(-lambda);
  let s = p;
  const u = r();
  while (u > s && k < 8) {
    k++;
    p = (p * lambda) / k;
    s += p;
  }
  return k;
}

const SLOTS_H = [1, 3.5, 6, 25, 27.5]; // hours after the window start (Sat 12:00 UTC): Sat 13:00/15:30/18:00, Sun 13:00/15:30 UTC

export class MockFootballDataProvider implements FootballDataProvider {
  constructor(private now: () => Date = () => new Date()) {}

  async getFixtures(w: Window, teams: Team[]): Promise<Fixture[]> {
    const out: Fixture[] = [];
    const pool = teams.filter((t) => t.national === w.international);
    const byLeague = new Map<string, Team[]>();
    for (const t of pool) byLeague.set(t.league, [...(byLeague.get(t.league) ?? []), t]);
    for (const [league, list] of byLeague) {
      const r = rng(`md${w.number}:${league}`);
      const shuffled = [...list].sort(() => r() - 0.5);
      for (let i = 0; i + 1 < shuffled.length; i += 2) {
        const home = shuffled[i]!;
        const away = shuffled[i + 1]!;
        const slot = SLOTS_H[Math.floor(r() * SLOTS_H.length)]!;
        out.push({
          providerFixtureId: `mock:${w.number}:${home.providerTeamId}:${away.providerTeamId}`,
          competition: w.international ? "international" : "league",
          home,
          away,
          kickoff: new Date(w.start.getTime() + slot * 3_600_000),
          status: "scheduled",
          homeGoals: null,
          awayGoals: null
        });
      }
    }
    return out.sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime());
  }

  /** Fixtures with the score as it stands now: finished after 115 minutes, live in between. */
  async getLiveScores(w: Window, teams: Team[]): Promise<Fixture[]> {
    const now = this.now().getTime();
    return (await this.getFixtures(w, teams)).map((f) => {
      const r = rng(f.providerFixtureId + ":score");
      const finalHome = poisson(1.5, r);
      const finalAway = poisson(1.15, r);
      const elapsed = (now - f.kickoff.getTime()) / 60_000;
      if (elapsed < 0) return f;
      if (elapsed >= 115) return { ...f, status: "finished", homeGoals: finalHome, awayGoals: finalAway };
      const frac = Math.min(1, elapsed / 95);
      return { ...f, status: "live", homeGoals: Math.round(finalHome * frac), awayGoals: Math.round(finalAway * frac) };
    });
  }

  async getResults(w: Window, teams: Team[]): Promise<Fixture[]> {
    return (await this.getLiveScores(w, teams)).filter((f) => f.status === "finished");
  }
}

// --- football-data.org -----------------------------------------------------
// One request per window: /v4/matches?dateFrom&dateTo across the plan's
// competitions. Teams are matched by their football-data id (the
// provider_team_id in fantasy_team_mappings). Nations' competitions (WC, EC
// and friendlies' codes) count as international; CL/EL as European.
const INTERNATIONAL = new Set(["WC", "EC", "CLI", "AFC", "CAF", "CONCACAF", "UNL"]);
const EUROPEAN = new Set(["CL", "EL", "ECL", "UCL", "UEL"]);

interface FdMatch {
  id: number;
  utcDate: string;
  status: string;
  competition: { code: string; type?: string };
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  score: { fullTime: { home: number | null; away: number | null }; halfTime?: { home: number | null; away: number | null } };
}

export class FootballDataOrgProvider implements FootballDataProvider {
  constructor(private apiKey: string, private fetchImpl: typeof fetch = fetch) {}

  private async matches(w: Window): Promise<FdMatch[]> {
    const day = (d: Date) => d.toISOString().slice(0, 10);
    const to = new Date(w.end.getTime() + 24 * 3_600_000);
    const res = await this.fetchImpl(`https://api.football-data.org/v4/matches?dateFrom=${day(w.start)}&dateTo=${day(to)}`, { headers: { "X-Auth-Token": this.apiKey } });
    if (!res.ok) throw new Error(`football-data.org ${res.status}`);
    const body = (await res.json()) as { matches?: FdMatch[] };
    return body.matches ?? [];
  }

  private convert(ms: FdMatch[], w: Window, teams: Team[]): Fixture[] {
    const byId = new Map(teams.map((t) => [t.providerTeamId, t]));
    const out: Fixture[] = [];
    for (const m of ms) {
      const kickoff = new Date(m.utcDate);
      if (kickoff < w.start || kickoff > w.end) continue;
      const home = byId.get(String(m.homeTeam.id));
      const away = byId.get(String(m.awayTeam.id));
      if (!home && !away) continue;
      const code = m.competition?.code ?? "";
      const competition: Fixture["competition"] = INTERNATIONAL.has(code) ? "international" : EUROPEAN.has(code) ? "european" : m.competition?.type === "CUP" ? "cup" : "league";
      // Clubs score on league weekends, nations in international windows — the matchday decides.
      if (w.international !== (competition === "international")) continue;
      const status: Fixture["status"] = m.status === "FINISHED" ? "finished" : ["IN_PLAY", "PAUSED", "LIVE"].includes(m.status) ? "live" : "scheduled";
      const stub = (t: { id: number; name: string }): Team => ({ clubId: "", providerTeamId: String(t.id), name: t.name, league: "", national: competition === "international" });
      out.push({
        providerFixtureId: `fd:${m.id}`,
        competition,
        home: home ?? stub(m.homeTeam),
        away: away ?? stub(m.awayTeam),
        kickoff,
        status,
        homeGoals: status === "scheduled" ? null : (m.score.fullTime.home ?? m.score.halfTime?.home ?? 0),
        awayGoals: status === "scheduled" ? null : (m.score.fullTime.away ?? m.score.halfTime?.away ?? 0)
      });
    }
    return out.sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime());
  }

  async getFixtures(w: Window, teams: Team[]): Promise<Fixture[]> {
    return this.convert(await this.matches(w), w, teams).map((f) => ({ ...f, status: "scheduled", homeGoals: null, awayGoals: null }));
  }
  async getLiveScores(w: Window, teams: Team[]): Promise<Fixture[]> {
    return this.convert(await this.matches(w), w, teams);
  }
  async getResults(w: Window, teams: Team[]): Promise<Fixture[]> {
    return (await this.getLiveScores(w, teams)).filter((f) => f.status === "finished");
  }
}

export function providerFor(name: string): FootballDataProvider {
  if (name === "mock") return new MockFootballDataProvider();
  if (name === "football-data") {
    const key = Deno.env.get("FOOTBALL_DATA_API_KEY");
    if (!key) throw new Error("FOOTBALL_DATA_API_KEY is not set");
    return new FootballDataOrgProvider(key);
  }
  throw new Error(`unknown football data provider: ${name}`);
}
