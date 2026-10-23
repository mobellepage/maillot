// The season so far, club by club: played, won, drawn, lost, goals and the
// points they'd have brought in Fantasy (win 3, draw 1 — the league table's
// own points). ESPN's standings for the leagues it covers; the Swiss Super
// League from TheSportsDB's rounds (its free table stops at five clubs).

export interface ClubSeason {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

const UA = { "User-Agent": "Mozilla/5.0 (Maillot Fantasy)", Accept: "application/json" };
export const ESPN_TABLE_LEAGUES = ["eng.1", "esp.1", "ger.1", "ita.1", "fra.1", "ned.1", "por.1", "tur.1"];

interface EspnEntry {
  team: { id: string };
  stats: { name: string; value?: number }[];
}

export async function espnTables(byEspnId: Map<string, string>, fetchImpl: typeof fetch = fetch): Promise<ClubSeason[]> {
  const out: ClubSeason[] = [];
  for (const code of ESPN_TABLE_LEAGUES) {
    const res = await fetchImpl(`https://site.api.espn.com/apis/v2/sports/soccer/${code}/standings`, { headers: UA });
    if (!res.ok) throw new Error(`espn standings ${code} ${res.status}`);
    const body = (await res.json()) as { children?: { standings?: { entries?: EspnEntry[] } }[]; standings?: { entries?: EspnEntry[] } };
    const entries = (body.children ?? [body]).flatMap((c) => c.standings?.entries ?? []);
    for (const e of entries) {
      const clubId = byEspnId.get(e.team.id);
      if (!clubId) continue;
      const v = (n: string) => Math.round(Number(e.stats.find((s) => s.name === n)?.value ?? 0));
      out.push({ clubId, played: v("gamesPlayed"), won: v("wins"), drawn: v("ties"), lost: v("losses"), goalsFor: v("pointsFor"), goalsAgainst: v("pointsAgainst"), points: v("wins") * 3 + v("ties") });
    }
  }
  return out;
}

interface TsdbEvent {
  idHomeTeam: string;
  idAwayTeam: string;
  intHomeScore: string | null;
  intAwayScore: string | null;
  strStatus: string | null;
  intRound: string | null;
}
const TSDB = "https://www.thesportsdb.com/api/v1/json/123";
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function swissTable(byTsdbId: Map<string, string>, season: string, fetchImpl: typeof fetch = fetch): Promise<ClubSeason[]> {
  const get = async (path: string): Promise<TsdbEvent[]> => {
    const res = await fetchImpl(`${TSDB}/${path}`, { headers: UA });
    if (!res.ok) throw new Error(`tsdb ${res.status}`);
    const body = (await res.json()) as { events?: TsdbEvent[] | null };
    return body.events ?? [];
  };
  const next = await get("eventsnextleague.php?id=4675");
  const upTo = Number(next[0]?.intRound ?? 0);
  const rows = new Map<string, ClubSeason>();
  const row = (clubId: string) => {
    if (!rows.has(clubId)) rows.set(clubId, { clubId, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
    return rows.get(clubId)!;
  };
  for (let r = 1; r <= upTo; r++) {
    await pause(2500);
    for (const e of await get(`eventsround.php?id=4675&r=${r}&s=${season}`)) {
      if ((e.strStatus ?? "").toUpperCase() !== "FT" || e.intHomeScore === null || e.intAwayScore === null) continue;
      const hg = Number(e.intHomeScore);
      const ag = Number(e.intAwayScore);
      for (const [id, gf, ga] of [[e.idHomeTeam, hg, ag], [e.idAwayTeam, ag, hg]] as [string, number, number][]) {
        const clubId = byTsdbId.get(id);
        if (!clubId) continue;
        const x = row(clubId);
        x.played++;
        x.goalsFor += gf;
        x.goalsAgainst += ga;
        if (gf > ga) x.won++;
        else if (gf === ga) x.drawn++;
        else x.lost++;
        x.points = x.won * 3 + x.drawn;
      }
    }
  }
  return [...rows.values()];
}
