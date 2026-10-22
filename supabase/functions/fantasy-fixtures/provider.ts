// The football data behind Fantasy's Matchday, behind one interface so the
// source can be swapped (a real feed later). Today: a mock that makes
// believable fixtures and results for the clubs the game knows.

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

export function providerFor(name: string): FootballDataProvider {
  // A real provider (e.g. football-data.org) plugs in here by name.
  if (name === "mock") return new MockFootballDataProvider();
  throw new Error(`unknown football data provider: ${name}`);
}
