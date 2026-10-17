// The article cards on SoccerBible's category page: each links to
// /performance/football-apparel/<year>/<month>/<slug>/ and names the
// article in its tracking call (name: '…'). Headline, link and date only.

export interface NewsItem {
  url: string;
  title: string;
  published_on: string;
}

const ENTITIES: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—" };
const decode = (s: string) =>
  s
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e: string) =>
      e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENTITIES[e.toLowerCase()] ?? m
    )
    .replace(/\\'/g, "'")
    .replace(/\s+/g, " ")
    .trim();

export function parseNews(html: string, today: Date): NewsItem[] {
  const out: NewsItem[] = [];
  const seen = new Set<string>();
  const card = /<a\s+href="(\/performance\/football-apparel\/(\d{4})\/(\d{2})\/[a-z0-9-]+\/)"[^>]*?onclick="articleCardTrackingEvent\(event,\s*\{\s*name:\s*'((?:[^'\\]|\\.)*)'/g;
  for (const m of html.matchAll(card)) {
    const [, path, year, month, rawTitle] = m;
    const url = "https://www.soccerbible.com" + path;
    if (seen.has(url)) continue;
    seen.add(url);
    const title = decode(rawTitle!).slice(0, 240);
    if (!title) continue;
    // The link carries only the month: the 1st of that month, never after today.
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
    const published = date > today ? today : date;
    out.push({ url, title, published_on: published.toISOString().slice(0, 10) });
  }
  return out.slice(0, 40);
}
