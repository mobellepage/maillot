// Collects market comparables for the catalogue from eBay (Browse API: live
// fixed-price listings on the configured marketplaces). Each title passes a
// strict prefilter (club alias + season, no kids' shirts or accessories);
// with ANTHROPIC_API_KEY set, Claude then sorts the shortlist into "exact",
// "similar" and "no". Prices are converted to CHF with ECB reference rates.
//
// Called daily by pg_cron (private.request_market_comps). Safe to call by
// anyone: it answers at once, works in the background and refuses to run
// more than once in 20 hours (start_market_comp_run, atomic), so it can't be
// used to burn the eBay quota.
// Inert until EBAY_CLIENT_ID and EBAY_CLIENT_SECRET are set.
import Anthropic from "npm:@anthropic-ai/sdk@^0.131.0";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { applyClassification, CLASSIFY_SCHEMA, classifyPrompt, fromEbay, MARKETPLACES, prefilter, searchQuery, toChf, type Classified, type Listing, type Marketplace, type Shirt } from "./comps.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const MAX_SHORTLIST = 60;
const CLASSIFY_CONCURRENCY = 4;
const MODEL = "claude-opus-5-5";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function ebayToken(id: string, secret: string): Promise<string> {
  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: "Basic " + btoa(`${id}:${secret}`) },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: "https://api.ebay.com/oauth/api_scope" }),
  });
  if (!res.ok) throw new Error(`eBay token ${res.status}`);
  return (await res.json()).access_token;
}

async function ebaySearch(token: string, m: Marketplace, q: string): Promise<Listing[]> {
  const url = new URL("https://api.ebay.com/buy/browse/v1/item_summary/search");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "100");
  url.searchParams.set("filter", "buyingOptions:{FIXED_PRICE}");
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, "X-EBAY-C-MARKETPLACE-ID": m, "Accept-Language": MARKETPLACES[m].lang } });
  if (!res.ok) throw new Error(`eBay search ${m} ${res.status}`);
  const body = await res.json();
  return ((body.itemSummaries ?? []) as unknown[]).map(fromEbay).filter((l): l is Listing => !!l);
}

/** CHF per unit of each currency, from the ECB reference rates. */
async function chfRates(): Promise<Record<string, number>> {
  const res = await fetch("https://api.frankfurter.dev/v1/latest?base=CHF");
  if (!res.ok) throw new Error(`rates ${res.status}`);
  const { rates } = (await res.json()) as { rates: Record<string, number> };
  return Object.fromEntries(Object.entries(rates).map(([c, perChf]) => [c, 1 / perChf]));
}

/** Claude's verdict, or "heuristic" when only the prefilter has looked at the title. */
type Verdict = Omit<Classified, "match"> & { match: Classified["match"] | "heuristic" };

async function classify(client: Anthropic, shirt: Shirt, listings: Listing[]): Promise<Classified[]> {
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: CLASSIFY_SCHEMA } },
    messages: [{ role: "user", content: classifyPrompt(shirt, listings) }],
  });
  if (response.stop_reason === "refusal") throw new Error("classification declined");
  const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
  return applyClassification(JSON.parse(text), listings.length);
}

async function run(runId: number) {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const stats = { shirts: 0, listings: 0, kept: 0 };
  try {
    const markets = (Deno.env.get("EBAY_MARKETPLACES") || "EBAY_DE,EBAY_GB,EBAY_FR,EBAY_IT").split(",").map((m) => m.trim()).filter((m): m is Marketplace => m in MARKETPLACES);
    const [token, rates, shirtsRes] = await Promise.all([
      ebayToken(Deno.env.get("EBAY_CLIENT_ID")!, Deno.env.get("EBAY_CLIENT_SECRET")!),
      chfRates(),
      db.from("catalog_shirts").select("id, club, name, season, year, brand").eq("active", true).order("id"),
    ]);
    if (shirtsRes.error) throw shirtsRes.error;
    const shirts = (shirtsRes.data ?? []) as Shirt[];
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const claude = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null;

    const work = async (shirt: Shirt) => {
      const found = new Map<string, Listing & { marketplace: Marketplace }>();
      for (const m of markets) {
        for (const l of await ebaySearch(token, m, searchQuery(shirt, m))) {
          stats.listings++;
          if (prefilter(l.title, shirt) && !found.has(l.itemId)) found.set(l.itemId, { ...l, marketplace: m });
        }
      }
      const shortlist = [...found.values()].slice(0, MAX_SHORTLIST);
      let verdicts: Verdict[] = shortlist.map(() => ({ match: "heuristic", edition: "unknown", condition: "unknown" }));
      if (claude && shortlist.length) {
        try {
          verdicts = await classify(claude, shirt, shortlist);
        } catch (e) {
          console.error("fetch-comps: classification failed for", shirt.id, e);
        }
      }
      const now = new Date().toISOString();
      const rows = shortlist
        .map((l, i) => ({ l, v: verdicts[i]!, chf: toChf(l.price, l.currency, rates) }))
        .filter(({ v, chf }) => v.match !== "no" && v.edition !== "retro_remake" && chf !== null)
        .map(({ l, v, chf }) => ({
          source: "ebay",
          external_id: l.itemId,
          catalog_id: shirt.id,
          marketplace: l.marketplace,
          kind: "listing",
          match: v.match,
          edition: v.edition,
          condition: v.condition,
          title: l.title,
          url: l.url,
          image_url: l.image,
          price: l.price,
          currency: l.currency,
          price_chf: chf,
          listed_at: l.listedAt,
          seen_at: now,
        }));
      if (rows.length) {
        const { error } = await db.from("market_comps").upsert(rows, { onConflict: "source,external_id,catalog_id" });
        if (error) throw error;
      }
      stats.shirts++;
      stats.kept += rows.length;
    };

    // A few shirts at a time: eBay calls are quick, classification takes a few seconds.
    for (let i = 0; i < shirts.length; i += CLASSIFY_CONCURRENCY) {
      await Promise.all(shirts.slice(i, i + CLASSIFY_CONCURRENCY).map((s) => work(s).catch((e) => console.error("fetch-comps:", s.id, e))));
    }
    // Listings gone for 90 days no longer say anything about today's market.
    await db.from("market_comps").delete().eq("kind", "listing").lt("seen_at", new Date(Date.now() - 90 * 864e5).toISOString());
    // Fresh comparables → fresh market values.
    await db.rpc("refresh_shirt_valuations");
    await db.from("market_comp_runs").update({ finished_at: new Date().toISOString(), ...stats }).eq("id", runId);
  } catch (e) {
    console.error("fetch-comps: run failed", e);
    await db.from("market_comp_runs").update({ finished_at: new Date().toISOString(), ...stats, error: String(e).slice(0, 500) }).eq("id", runId);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!Deno.env.get("EBAY_CLIENT_ID") || !Deno.env.get("EBAY_CLIENT_SECRET")) return json({ configured: false });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: runId, error } = await db.rpc("start_market_comp_run");
  if (error) return json({ error: "could not start" }, 500);
  if (runId === null) return json({ skipped: "ran recently" });
  EdgeRuntime.waitUntil(run(runId));
  return json({ started: runId }, 202);
});
