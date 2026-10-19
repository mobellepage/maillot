// Photo → shirt. The member's photos (front, back, crest, inner label) go to
// Claude with the catalogue and the library's clubs; then, for that club, the
// photos are compared with the library's pictures of its likely kits, which
// names the exact kit or ranks the closest five for the member to pick from.
// The answer prefills the add-shirt and sell flows.
// Photos are not stored here — only the structured result
// (shirt_identifications). Rate-limited per member and globally
// (consume_identify_quota). Inert until ANTHROPIC_API_KEY is set.
import Anthropic from "npm:@anthropic-ai/sdk@^0.131.0";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";
import { IDENTIFY_SCHEMA, IMAGE_KINDS, MATCH_PROMPT, MATCH_SCHEMA, MAX_IMAGE_BASE64, MAX_IMAGES, MEDIA_TYPES, MODEL, normalize, pickLibraryKits, systemPrompt, type CatalogEntry, type ImageKind, type Lang, type LibraryClub, type LibraryKit } from "./identify.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

/** Where the library's kit pictures are served (the app's public folder). */
const SITE = (Deno.env.get("APP_URL") || "https://maillot-two.vercel.app").replace(/\/$/, "");
/** A comparison only names the kit when it is at least this sure; below, the member picks. */
const MATCH_SURE = 0.7;

type KitRow = { id: string; club_id: string; club_name: string; season: string; kind: string; variant: string; image_path: string };
const asKit = (k: KitRow): LibraryKit => ({ id: k.id, clubId: k.club_id, clubName: k.club_name, season: k.season, kind: k.kind, variant: k.variant, image: k.image_path });

const KIND_LABEL: Record<ImageKind, string> = { front: "Front of the shirt", back: "Back of the shirt", crest: "Crest close-up", label: "Inner label (wash/product tag)" };

interface InImage {
  kind: ImageKind;
  mediaType: (typeof MEDIA_TYPES)[number];
  data: string;
}

function parseImages(body: unknown): InImage[] | null {
  const images = (body as { images?: unknown })?.images;
  if (!Array.isArray(images) || images.length < 1 || images.length > MAX_IMAGES) return null;
  const out: InImage[] = [];
  for (const i of images) {
    const { kind, mediaType, data } = (i ?? {}) as Record<string, unknown>;
    if (!IMAGE_KINDS.includes(kind as ImageKind) || !MEDIA_TYPES.includes(mediaType as InImage["mediaType"])) return null;
    if (typeof data !== "string" || data.length < 100 || data.length > MAX_IMAGE_BASE64 || !/^[A-Za-z0-9+/=]+$/.test(data)) return null;
    out.push({ kind: kind as ImageKind, mediaType: mediaType as InImage["mediaType"], data });
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  // Read the body before any early answer: responding while a large upload is
  // still streaming in stalls the runtime until its wall-clock limit (503).
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ configured: false });
  const images = parseImages(body);
  if (!images) return json({ error: "invalid_images" }, 400);
  const lang: Lang = ["de", "fr"].includes((body as { lang?: string }).lang ?? "") ? ((body as { lang: Lang }).lang) : "en";

  const asUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return json({ error: "not_authenticated" }, 401);
  const quota = await asUser.rpc("consume_identify_quota");
  // P0402: the plan's limit (free scans used / premium only) — the app offers premium.
  const limit = quota.error?.code === "P0402";
  if (quota.error) return json({ error: limit ? "quota" : quota.error.code === "P0429" ? "rate_limited" : "quota_failed" }, limit ? 402 : quota.error.code === "P0429" ? 429 : 500);

  const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: rows, error: catErr } = await service.from("catalog_shirts").select("id, club, name, season, brand, type").eq("active", true).order("id");
  if (catErr) return json({ error: "catalog_failed" }, 500);
  const catalog = (rows ?? []) as CatalogEntry[];
  const { data: clubRows } = await service.from("kit_clubs").select("id, name").order("id");
  const clubs = (clubRows ?? []) as LibraryClub[];

  // Both passes answer well inside the runtime's 150 s wall clock, with a clear error instead of a stall.
  const client = new Anthropic({ apiKey, timeout: 60_000, maxRetries: 0 });
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const img of images) {
    content.push({ type: "text", text: KIND_LABEL[img.kind] + ":" });
    content.push({ type: "image", source: { type: "base64", media_type: img.mediaType, data: img.data } });
  }
  content.push({ type: "text", text: "Identify this shirt." });

  const request = (structured: boolean) =>
    client.beta.messages.create({
      // IDENTIFY_MODEL (Supabase secret) switches to a cheaper model without a deploy.
      model: Deno.env.get("IDENTIFY_MODEL") || MODEL,
      max_tokens: 16000,
      // A safety decline is re-run on Anthropic's recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // The catalogue changes rarely: cache the system prompt across members.
      system: [{ type: "text", text: systemPrompt(catalog, lang, clubs) + (structured ? "" : `\n\nAnswer with only a JSON object matching this JSON schema:\n${JSON.stringify(IDENTIFY_SCHEMA)}`), cache_control: { type: "ephemeral" } }],
      output_config: structured ? { effort: "low", format: { type: "json_schema", schema: IDENTIFY_SCHEMA } } : { effort: "low" },
      messages: [{ role: "user", content }],
    });

  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await request(true);
  } catch (e) {
    // A schema the API rejects must not take recognition down: retry once and parse strictly ourselves.
    if (e instanceof Anthropic.BadRequestError) {
      console.error("identify-shirt: structured request rejected, retrying without schema", e.message);
      try {
        response = await request(false);
      } catch (e2) {
        console.error("identify-shirt: request failed", e2);
        return json({ error: "model_failed" }, 502);
      }
    } else {
      console.error("identify-shirt: request failed", e);
      return json({ error: e instanceof Anthropic.RateLimitError ? "busy" : "model_failed" }, 502);
    }
  }

  if (response.stop_reason === "refusal") return json({ error: "declined" }, 422);
  const text = response.content.find((b) => b.type === "text")?.text ?? "";
  let raw: unknown;
  try {
    raw = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  } catch {
    console.error("identify-shirt: unparseable answer", response.stop_reason, text.slice(0, 200));
    return json({ error: "model_failed" }, 502);
  }
  const result = normalize(raw, new Set(catalog.map((c) => c.id)), new Set(clubs.map((c) => c.id)));

  // The library has every kit of the big leagues and nations: compare the
  // photos with the pictures of the club's likely kits.
  if (result.isShirt && result.libraryClub) {
    const { data: rows } = await service.rpc("library_kit_candidates", { p_club_id: result.libraryClub, p_kind: result.kit, p_year_from: result.yearFrom ?? null, p_year_to: result.yearTo ?? null, p_limit: 20 });
    const shown = ((rows ?? []) as KitRow[]).map(asKit);
    if (shown.length) {
      const match = await compareWithLibrary(client, content.slice(0, -1), shown);
      if (match) {
        result.libraryCandidates = match.candidates;
        if (match.kit && match.confidence >= MATCH_SURE) {
          result.libraryKit = match.kit;
          result.club = match.kit.clubName;
          result.season = match.kit.season.replace("/", "-");
          result.confidence = Math.max(result.confidence, match.confidence);
        }
      } else result.libraryCandidates = shown.slice(0, 5);
    }
  }
  // Without a comparison: the kit with the season the photos named, when there is one.
  if (result.isShirt && !result.libraryKit && result.club && result.season) {
    const { data: hit } = await service.rpc("match_library_kit", { p_club: result.club, p_season: result.season, p_kind: result.kit, p_hint: result.summary });
    const k = (hit as KitRow[] | null)?.[0];
    result.libraryKit = k ? asKit(k) : null;
  }

  await service.from("shirt_identifications").insert({ user_id: user.id, catalog_id: result.catalogId, confidence: result.confidence, result, model: response.model });
  return json({ configured: true, result });
});

/** Second pass: the member's photos next to the numbered library pictures. Null when it fails (the first answer stands). */
async function compareWithLibrary(client: Anthropic, photos: Anthropic.Beta.BetaContentBlockParam[], shown: LibraryKit[]) {
  try {
    // Loaded here and sent along (small WebP files): the site keeps AI crawlers out.
    const pictures = (await Promise.all(shown.map(async (k) => {
      const res = await fetch(SITE + k.image, { signal: AbortSignal.timeout(10_000) }).catch(() => null);
      if (!res?.ok || !/^image\/(webp|png|jpeg)/.test(res.headers.get("content-type") ?? "")) return null;
      return { kit: k, mediaType: res.headers.get("content-type")!.split(";")[0] as "image/webp" | "image/png" | "image/jpeg", data: encodeBase64(new Uint8Array(await res.arrayBuffer())) };
    }))).filter((p): p is NonNullable<typeof p> => !!p);
    if (!pictures.length) return null;
    const content: Anthropic.Beta.BetaContentBlockParam[] = [...photos, { type: "text", text: "Library pictures:" }];
    pictures.forEach((p, i) => {
      content.push({ type: "text", text: `${i + 1}. ${p.kit.season} ${p.kit.kind}${p.kit.variant ? " · " + p.kit.variant : ""}` });
      content.push({ type: "image", source: { type: "base64", media_type: p.mediaType, data: p.data } });
    });
    content.push({ type: "text", text: "Which library picture shows this shirt?" });
    const response = await client.beta.messages.create(
      {
        model: Deno.env.get("IDENTIFY_MODEL") || MODEL,
        max_tokens: 4000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: MATCH_PROMPT,
        output_config: { effort: "medium", format: { type: "json_schema", schema: MATCH_SCHEMA } },
        messages: [{ role: "user", content }],
      },
      { timeout: 60_000 },
    );
    if (response.stop_reason === "refusal") return null;
    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    return pickLibraryKits(JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)), pictures.map((p) => p.kit));
  } catch (e) {
    console.error("identify-shirt: library comparison failed", e);
    return null;
  }
}
