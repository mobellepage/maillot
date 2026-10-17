// Kit news for Discover: reads the headlines on SoccerBible's football
// apparel page — title, link and the month in the link — and hands them to
// store_news, which matches each to a club and kit of the library. Only
// headlines and links are kept; SoccerBible's articles and photos stay on
// their site (the app links to them and names the source).
//
// Called every six hours by pg_cron (private.request_news). Safe to call by
// anyone: it refuses to fetch more than once in 50 minutes (start_news_fetch).
import { createClient } from "jsr:@supabase/supabase-js@2";
import { parseNews } from "./parse.ts";

const PAGE = "https://www.soccerbible.com/performance/football-apparel/";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async () => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: due, error: dueError } = await db.rpc("start_news_fetch");
  if (dueError) return json({ error: "start failed" }, 500);
  if (!due) return json({ skipped: "fetched recently" });

  const res = await fetch(PAGE, { headers: { "User-Agent": "MaillotNews/1.0 (+https://maillot-two.vercel.app; headlines and links only)", Accept: "text/html" } });
  if (!res.ok) return json({ error: `source ${res.status}` }, 502);
  const items = parseNews(await res.text(), new Date());
  if (!items.length) return json({ error: "no headlines found" }, 502);

  const { data: stored, error } = await db.rpc("store_news", { p_items: items });
  if (error) return json({ error: "store failed" }, 500);
  return json({ stored });
});
