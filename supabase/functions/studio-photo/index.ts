// Cuts the shirt out of a member's main photo (Photoroom Remove Background
// API) and returns it with a transparent background, cropped to the shirt.
// The app then places it on MAILLOT's dark studio background, so every
// collection looks alike. The original photo stays untouched (and is what
// authentication looks at). Rate-limited (consume_studio_quota); inert until
// PHOTOROOM_API_KEY is set.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
/** ~1.5 MB of JPEG; the app sends ≤1600 px photos well under this. */
const MAX_BASE64 = 2_000_000;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const apiKey = Deno.env.get("PHOTOROOM_API_KEY");
  if (!apiKey) return json({ configured: false });

  let image: string | undefined;
  try {
    image = (await req.json())?.image;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  if (typeof image !== "string" || image.length < 100 || image.length > MAX_BASE64 || !/^[A-Za-z0-9+/=]+$/.test(image)) return json({ error: "invalid_image" }, 400);

  const asUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return json({ error: "not_authenticated" }, 401);
  const quota = await asUser.rpc("consume_studio_quota");
  if (quota.error) return json({ error: quota.error.code === "P0429" ? "rate_limited" : "quota_failed" }, quota.error.code === "P0429" ? 429 : 500);

  const form = new FormData();
  form.append("image_file", new Blob([Uint8Array.from(atob(image), (c) => c.charCodeAt(0))], { type: "image/jpeg" }), "shirt.jpg");
  form.append("format", "png");
  form.append("size", "medium");
  form.append("crop", "true");
  const res = await fetch("https://sdk.photoroom.com/v1/segment", { method: "POST", headers: { "x-api-key": apiKey }, body: form });
  if (!res.ok) {
    console.error("studio-photo: Photoroom", res.status, (await res.text()).slice(0, 300));
    return json({ error: "cutout_failed" }, 502);
  }
  const png = new Uint8Array(await res.arrayBuffer());
  let binary = "";
  for (let i = 0; i < png.length; i += 0x8000) binary += String.fromCharCode(...png.subarray(i, i + 0x8000));
  return json({ configured: true, png: btoa(binary) });
});
