// Automatic authenticity pre-check. The member's required photos (front,
// back, badge, print, inner label) are read from their own folder in
// vault-photos and go to Claude together with what the member says the
// shirt is. The answer is a hint with reasons — never a guarantee. Shares the
// AI budget with recognition (consume_identify_quota). Nothing is stored
// here; the app keeps the result with the shirt. Inert until
// ANTHROPIC_API_KEY is set.
import Anthropic from "npm:@anthropic-ai/sdk@^0.131.0";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { CHECK_KINDS, CHECK_SCHEMA, KIND_LABEL, MAX_IMAGE_BYTES, MODEL, claimText, normalizeCheck, systemPrompt, type CheckKind, type Claim, type Lang } from "./check.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const MEDIA = ["image/jpeg", "image/png", "image/webp"] as const;

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

function parse(body: unknown, userId: string): { photos: { kind: CheckKind; path: string }[]; claim: Claim; lang: Lang } | null {
  const b = (body ?? {}) as Record<string, unknown>;
  if (!Array.isArray(b.photos) || b.photos.length < 1 || b.photos.length > CHECK_KINDS.length) return null;
  const photos: { kind: CheckKind; path: string }[] = [];
  for (const p of b.photos) {
    const { kind, path } = (p ?? {}) as Record<string, unknown>;
    // Only the member's own photos, one per kind.
    if (!CHECK_KINDS.includes(kind as CheckKind) || photos.some((x) => x.kind === kind)) return null;
    if (typeof path !== "string" || !path.startsWith(userId + "/") || path.includes("..") || path.length > 300) return null;
    photos.push({ kind: kind as CheckKind, path });
  }
  const c = (b.claim ?? {}) as Record<string, unknown>;
  const claim: Claim = {
    shirt: text(c.shirt, 160),
    version: text(c.version, 40),
    print: text(c.print, 60),
    patches: Array.isArray(c.patches) ? c.patches.map((x) => text(x, 60)).filter((x): x is string => !!x).slice(0, 6) : [],
  };
  const lang: Lang = b.lang === "de" || b.lang === "fr" ? b.lang : "en";
  return { photos, claim, lang };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ configured: false });

  const asUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return json({ error: "not_authenticated" }, 401);
  const input = parse(body, user.id);
  if (!input) return json({ error: "invalid_input" }, 400);
  const quota = await asUser.rpc("consume_identify_quota");
  if (quota.error) return json({ error: quota.error.code === "P0429" ? "rate_limited" : "quota_failed" }, quota.error.code === "P0429" ? 429 : 500);

  const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const p of input.photos) {
    const { data: blob, error } = await service.storage.from("vault-photos").download(p.path);
    if (error || !blob) return json({ error: "photo_missing" }, 404);
    if (blob.size > MAX_IMAGE_BYTES) return json({ error: "photo_too_large" }, 413);
    const mediaType = (MEDIA as readonly string[]).includes(blob.type) ? (blob.type as (typeof MEDIA)[number]) : "image/jpeg";
    content.push({ type: "text", text: KIND_LABEL[p.kind] + ":" });
    content.push({ type: "image", source: { type: "base64", media_type: mediaType, data: toBase64(new Uint8Array(await blob.arrayBuffer())) } });
  }
  content.push({ type: "text", text: claimText(input.claim) + "\n\nPre-check this shirt." });

  const client = new Anthropic({ apiKey, timeout: 100_000, maxRetries: 0 });
  const request = (structured: boolean) =>
    client.beta.messages.create({
      model: Deno.env.get("AUTH_CHECK_MODEL") || Deno.env.get("IDENTIFY_MODEL") || MODEL,
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [{ type: "text", text: systemPrompt(input.lang) + (structured ? "" : `\n\nAnswer with only a JSON object matching this JSON schema:\n${JSON.stringify(CHECK_SCHEMA)}`), cache_control: { type: "ephemeral" } }],
      output_config: structured ? { effort: "medium", format: { type: "json_schema", schema: CHECK_SCHEMA } } : { effort: "medium" },
      messages: [{ role: "user", content }],
    });

  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await request(true);
  } catch (e) {
    if (e instanceof Anthropic.BadRequestError) {
      console.error("authenticity-check: structured request rejected, retrying without schema", e.message);
      try {
        response = await request(false);
      } catch (e2) {
        console.error("authenticity-check: request failed", e2);
        return json({ error: "model_failed" }, 502);
      }
    } else {
      console.error("authenticity-check: request failed", e);
      return json({ error: e instanceof Anthropic.RateLimitError ? "busy" : "model_failed" }, 502);
    }
  }

  if (response.stop_reason === "refusal") return json({ error: "declined" }, 422);
  const answer = response.content.find((b) => b.type === "text")?.text ?? "";
  let raw: unknown;
  try {
    raw = JSON.parse(answer.slice(answer.indexOf("{"), answer.lastIndexOf("}") + 1));
  } catch {
    console.error("authenticity-check: unparseable answer", response.stop_reason, answer.slice(0, 200));
    return json({ error: "model_failed" }, 502);
  }
  return json({ configured: true, result: normalizeCheck(raw) });
});
