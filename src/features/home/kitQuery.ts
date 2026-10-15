// Splits a home-page search into what the kit library understands: club
// text, a year or season and a kind — "Milan 2006/07", "YB Heim",
// "Brazil 1970 away". Pure, so it's unit-tested.

export interface KitQuery {
  club: string;
  year: number | null;
  season: string | null;
  kind: string | null;
}

const KINDS: [RegExp, string][] = [
  [/^(heim|home|domicile|casa)$/, 'home'],
  [/^(auswärts|auswaerts|away|extérieur|exterieur|trasferta)$/, 'away'],
  [/^(ausweich|third|troisième|troisieme)$/, 'third'],
  [/^(torwart|goalie|gk|goalkeeper|gardien|portiere)$/, 'goalkeeper']
];
const FILLER = /^(trikot|trikots|shirt|kit|jersey|maillot|maglia|camiseta|von|of|de|du)$/;

export function parseKitQuery(q: string): KitQuery {
  let s = ' ' + q.toLowerCase().replace(/[«»"“”]/g, ' ') + ' ';
  let year: number | null = null;
  let season: string | null = null;
  const both = /\s(1[89]\d{2}|20\d{2})\s*[/–-]\s*(\d{2})\s/.exec(s);
  const single = /\s(1[89]\d{2}|20\d{2})\s/.exec(s);
  if (both) {
    year = Number(both[1]);
    season = both[1] + '/' + both[2];
    s = s.replace(both[0], ' ');
  } else if (single) {
    year = Number(single[1]);
    s = s.replace(single[0], ' ');
  }
  let kind: string | null = null;
  const rest: string[] = [];
  for (const w of s.split(/\s+/).filter(Boolean)) {
    const k = KINDS.find(([re]) => re.test(w));
    if (k && !kind) kind = k[1];
    else if (!FILLER.test(w)) rest.push(w);
  }
  return { club: rest.join(' '), year, season, kind };
}
