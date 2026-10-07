// Photo → shirt. The member's photos (front, crest, inner label) go to Claude
// with the catalogue; the answer prefills the add-shirt and sell flows.
// Photos are not stored here — only the structured result
// (shirt_identifications). Rate-limited per member and globally
// (consume_identify_quota). Inert until ANTHROPIC_API_KEY is set.
import Anthropic from "npm:@anthropic-ai/sdk@^0.131.0";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { IDENTIFY_SCHEMA, IMAGE_KINDS, MAX_IMAGE_BASE64, MAX_IMAGES, MEDIA_TYPES, MODEL, normalize, systemPrompt, type CatalogEntry, type ImageKind, type Lang } from "./identify.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

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

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ configured: false });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const images = parseImages(body);
  if (!images) return json({ error: "invalid_images" }, 400);
  const lang: Lang = ["de", "fr"].includes((body as { lang?: string }).lang ?? "") ? ((body as { lang: Lang }).lang) : "en";

  const asUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return json({ error: "not_authenticated" }, 401);
  const quota = await asUser.rpc("consume_identify_quota");
  if (quota.error) return json({ error: quota.error.code === "P0429" ? "rate_limited" : "quota_failed" }, quota.error.code === "P0429" ? 429 : 500);

  const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: rows, error: catErr } = await service.from("catalog_shirts").select("id, club, name, season, brand, type").eq("active", true).order("id");
  if (catErr) return json({ error: "catalog_failed" }, 500);
  const catalog = (rows ?? []) as CatalogEntry[];

  const client = new Anthropic({ apiKey });
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const img of images) {
    content.push({ type: "text", text: KIND_LABEL[img.kind] + ":" });
    content.push({ type: "image", source: { type: "base64", media_type: img.mediaType, data: img.data } });
  }
  content.push({ type: "text", text: "Identify this shirt." });

  const request = (structured: boolean) =>
    client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // A safety decline is re-run on Anthropic's recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // The catalogue changes rarely: cache the system prompt across members.
      system: [{ type: "text", text: systemPrompt(catalog, lang) + (structured ? "" : `\n\nAnswer with only a JSON object matching this JSON schema:\n${JSON.stringify(IDENTIFY_SCHEMA)}`), cache_control: { type: "ephemeral" } }],
      output_config: structured ? { effort: "medium", format: { type: "json_schema", schema: IDENTIFY_SCHEMA } } : { effort: "medium" },
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
  const result = normalize(raw, new Set(catalog.map((c) => c.id)));

  await service.from("shirt_identifications").insert({ user_id: user.id, catalog_id: result.catalogId, confidence: result.confidence, result, model: response.model });
  return json({ configured: true, result });
});
