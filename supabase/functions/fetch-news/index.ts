// Kit news for Discover: reads the headlines on SoccerBible's football
// apparel page — title, teaser, link, the month in the link and the title
// picture (used with permission) — and hands them to store_news, which matches each
// to a club and kit of the library. Each picture is copied once into the
// public news-images bucket, so the app loads it from our own storage.
//
// Called every six hours by pg_cron (private.request_news). Safe to call by
// anyone: it refuses to fetch more than once in 50 minutes (start_news_fetch).
import { createClient } from "jsr:@supabase/supabase-js@2";
import { parseNews } from "./parse.ts";

const PAGE = "https://www.soccerbible.com/performance/football-apparel/";
const UA = "MaillotNews/1.0 (+https://maillot-two.vercel.app)";
const BUCKET = "news-images";
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async () => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: due, error: dueError } = await db.rpc("start_news_fetch");
  if (dueError) return json({ error: "start failed" }, 500);
  if (!due) return json({ skipped: "fetched recently" });

  const res = await fetch(PAGE, { headers: { "User-Agent": UA, Accept: "text/html" } });
  if (!res.ok) return json({ error: `source ${res.status}` }, 502);
  const items = parseNews(await res.text(), new Date());
  if (!items.length) return json({ error: "no headlines found" }, 502);

  // Pictures we don't have yet (at most 20 a run).
  const { data: known } = await db.from("news_items").select("url, image_path").in("url", items.map((i) => i.url));
  const have = new Set((known ?? []).filter((k) => k.image_path).map((k) => k.url));
  let copied = 0;
  const stored = [];
  for (const item of items) {
    let image_path: string | undefined;
    if (item.image && !have.has(item.url) && copied < 20) {
      try {
        const pic = await fetch(item.image, { headers: { "User-Agent": UA } });
        const type = (pic.headers.get("content-type") ?? "").split(";")[0]!.trim();
        const body = new Uint8Array(await pic.arrayBuffer());
        if (pic.ok && TYPES[type] && body.byteLength > 0 && body.byteLength <= 1_000_000) {
          const slug = item.url.replace(/\/$/, "").split("/").pop()!.slice(0, 80);
          const path = `soccerbible/${slug}.${TYPES[type]}`;
          const { error } = await db.storage.from(BUCKET).upload(path, body, { contentType: type, upsert: true, cacheControl: "604800" });
          if (!error) {
            image_path = path;
            copied++;
          }
        }
      } catch {
        // No picture this time; the next run tries again.
      }
    }
    stored.push({ url: item.url, title: item.title, published_on: item.published_on, excerpt: item.excerpt ?? null, ...(image_path ? { image_path } : {}) });
  }

  const { data: n, error } = await db.rpc("store_news", { p_items: stored });
  if (error) return json({ error: "store failed" }, 500);
  return json({ stored: n, pictures: copied });
});
