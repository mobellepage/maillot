// Seller payout onboarding (Stripe Connect Express). Creates the seller's
// connected account on first use and returns a Stripe-hosted onboarding link
// (or, once payouts are enabled, a link to their Express dashboard).
// Inert until STRIPE_SECRET_KEY is set.
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.0.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// Where Stripe sends people back. On the web: the site they came from, but
// only our own (or localhost) — never an arbitrary origin. In the iOS app:
// the site's /return page, which hands over to the app via maillot://.
function returnUrl(req: Request, path: string, app: boolean) {
  const site = (Deno.env.get("APP_URL") || "https://maillot-two.vercel.app").replace(/\/$/, "");
  if (app) return `${site}/return?to=${encodeURIComponent(path)}`;
  const origin = req.headers.get("origin") ?? "";
  const ours = origin === site || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) || /^https:\/\/maillot-[a-z0-9-]+\.vercel\.app$/.test(origin);
  return (ours ? origin : site) + path;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) return json({ configured: false, message: "Payouts are not switched on yet. Set STRIPE_SECRET_KEY (with Connect enabled) to enable seller payouts." });

  const asUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return json({ configured: true, error: "Not authenticated" }, 401);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const stripe = new Stripe(key, { apiVersion: "2024-12-18.acacia" });
  const { data: profile } = await db.from("profiles").select("stripe_account_id, payouts_enabled").eq("id", user.id).maybeSingle();

  let account = profile?.stripe_account_id as string | null;
  if (!account) {
    const created = await stripe.accounts.create(
      { type: "express", country: "CH", email: user.email ?? undefined, capabilities: { transfers: { requested: true } }, metadata: { user_id: user.id } },
      { idempotencyKey: "connect-account-" + user.id }
    );
    account = created.id;
    await db.from("profiles").update({ stripe_account_id: account }).eq("id", user.id);
  }

  if (profile?.payouts_enabled) {
    const login = await stripe.accounts.createLoginLink(account);
    return json({ configured: true, url: login.url, kind: "dashboard" });
  }
  const app = (await req.json().catch(() => null))?.app === true;
  const link = await stripe.accountLinks.create({ account, type: "account_onboarding", refresh_url: returnUrl(req, "/vault?payouts=retry", app), return_url: returnUrl(req, "/vault?payouts=done", app) });
  return json({ configured: true, url: link.url, kind: "onboarding" });
});
