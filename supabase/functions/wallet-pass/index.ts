// Apple Wallet pass for a MAILLOT certificate of authenticity:
//   GET ?code=MLT-XXXX-XXXX-XXXX → signed .pkpass (shirt, size, inspection
//   date, QR code to the public certificate page; voided once revoked)
//   GET ?probe=1 → { configured } so the app only offers the button when
//   passes can actually be signed.
// Certificates are public (verify_certificate), so this needs no sign-in.
// Inert until the Pass Type ID certificate and key are set as secrets.
import forge from "npm:node-forge@1.4.0";
import { zipSync } from "npm:fflate@0.8.3";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildManifest, buildPassJson, CODE, type CertificateInfo } from "./pass.ts";
import { signManifest } from "./sign.ts";
import * as images from "./images.ts";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const env = (k: string) => Deno.env.get(k) ?? "";
const configured = () => !!(env("PASS_TYPE_ID") && env("APPLE_TEAM_ID") && env("PASS_CERT_PEM") && env("PASS_KEY_PEM") && env("APPLE_WWDR_PEM"));
const b64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
/** Checklist versions and their number of checks (src/config/inspection.ts). */
const CHECKS: Record<string, number> = { v1: 14 };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET") return json({ error: "GET only" }, 405);
  const url = new URL(req.url);
  if (url.searchParams.has("probe")) return json({ configured: configured() });
  if (!configured()) return json({ configured: false }, 501);

  const code = (url.searchParams.get("code") ?? "").toUpperCase();
  if (!CODE.test(code)) return json({ error: "invalid code" }, 400);

  const db = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"));
  const { data: rows, error } = await db.rpc("verify_certificate", { p_code: code });
  const cert = rows?.[0];
  if (error || !cert) return json({ error: "certificate not found" }, 404);
  const { data: shirt } = await db.from("catalog_shirts").select("name, club, season").eq("id", cert.shirt_id).maybeSingle();

  const info: CertificateInfo = {
    code: cert.code,
    shirtName: shirt?.name ?? cert.shirt_id ?? "Football shirt",
    club: shirt?.club ?? "",
    season: shirt?.season ?? "",
    size: cert.size,
    issuedAt: cert.issued_at,
    revoked: cert.revoked,
    checksPassed: CHECKS[(cert.checks as { checklist?: string })?.checklist ?? "v1"] ?? 14,
  };
  const passJson = buildPassJson(info, { passTypeIdentifier: env("PASS_TYPE_ID"), teamIdentifier: env("APPLE_TEAM_ID"), siteUrl: env("APP_URL") || "https://maillot-two.vercel.app" });

  const files: Record<string, Uint8Array> = {
    "pass.json": new TextEncoder().encode(JSON.stringify(passJson)),
    "icon.png": b64(images.icon_png),
    "icon@2x.png": b64(images.icon_2x_png),
    "icon@3x.png": b64(images.icon_3x_png),
    "logo.png": b64(images.logo_png),
    "logo@2x.png": b64(images.logo_2x_png),
  };
  const manifest = JSON.stringify(await buildManifest(files));
  let signature: Uint8Array;
  try {
    signature = signManifest(forge, manifest, { certPem: env("PASS_CERT_PEM"), keyPem: env("PASS_KEY_PEM"), keyPassphrase: env("PASS_KEY_PASSPHRASE") || undefined, wwdrPem: env("APPLE_WWDR_PEM") });
  } catch (e) {
    console.error("wallet-pass: signing failed", e);
    return json({ error: "signing failed" }, 500);
  }
  const pkpass = zipSync({ ...files, "manifest.json": new TextEncoder().encode(manifest), signature });
  return new Response(pkpass, {
    headers: {
      ...CORS,
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": `attachment; filename="MAILLOT-${code}.pkpass"`,
      // A revoked certificate must not keep circulating as a valid pass.
      "Cache-Control": "no-store",
    },
  });
});
