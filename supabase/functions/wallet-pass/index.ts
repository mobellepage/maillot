// Apple Wallet passes:
//   GET ?code=MLT-XXXX-XXXX-XXXX → signed .pkpass for a certificate of
//   authenticity (shirt, size, inspection date, QR code to the public
//   certificate page; voided once revoked)
//   POST { item, strip2x, strip3x, color } (signed in) → the collector card of
//   one of the member's own shirts: stored privately, answered with a short-
//   lived link to the .pkpass (so Safari hands it to Wallet)
//   GET ?probe=1 → { configured } so the app only offers the button when
//   passes can actually be signed.
// Certificates are public (verify_certificate), so this needs no sign-in.
// Inert until the Pass Type ID certificate and key are set as secrets.
import forge from "npm:node-forge@1.4.0";
import { zipSync } from "npm:fflate@0.8.3";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildCollectionPassJson, buildManifest, buildPassJson, CODE, passColor, type CertificateInfo } from "./pass.ts";
import { signManifest } from "./sign.ts";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
/** The strip pictures the app draws: PNG, well under this as base64. */
const MAX_STRIP = 2_500_000;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const env = (k: string) => Deno.env.get(k) ?? "";
const configured = () => !!(env("PASS_TYPE_ID") && env("APPLE_TEAM_ID") && env("PASS_CERT_PEM") && env("PASS_KEY_PEM") && env("APPLE_WWDR_PEM"));
const b64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
/** Icon and logo every pass carries: the site serves them (public/wallet, made by scripts/brand-assets.mjs). */
const BRAND = ["icon.png", "icon@2x.png", "icon@3x.png", "logo.png", "logo@2x.png"];
let brand: Promise<Record<string, Uint8Array>> | null = null;
function brandImages(): Promise<Record<string, Uint8Array>> {
  brand ??= Promise.all(
    BRAND.map(async (name) => {
      const res = await fetch(`${env("APP_URL") || "https://maillot.app"}/wallet/${name}`);
      // (the site answers unknown paths with the app page, so check it really is a PNG)
      if (!res.ok || !res.headers.get("content-type")?.startsWith("image/png")) throw new Error(`wallet-pass: ${name} ${res.status}`);
      return [name, new Uint8Array(await res.arrayBuffer())] as const;
    }),
  ).then(Object.fromEntries).catch((e) => {
    brand = null; // try again on the next pass
    throw e;
  });
  return brand;
}
/** Checklist versions and their number of checks (src/config/inspection.ts). */
const CHECKS: Record<string, number> = { v1: 14 };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method === "POST") return collectorCard(req);
  if (req.method !== "GET") return json({ error: "GET or POST only" }, 405);
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
  const passJson = buildPassJson(info, { passTypeIdentifier: env("PASS_TYPE_ID"), teamIdentifier: env("APPLE_TEAM_ID"), siteUrl: env("APP_URL") || "https://maillot.app" });

  const files: Record<string, Uint8Array> = {
    "pass.json": new TextEncoder().encode(JSON.stringify(passJson)),
    ...(await brandImages()),
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
      "Content-Disposition": `attachment; filename="Maillot-${code}.pkpass"`,
      // A revoked certificate must not keep circulating as a valid pass.
      "Cache-Control": "no-store",
    },
  });
});

/** The collector card of one of the member's own shirts. */
async function collectorCard(req: Request): Promise<Response> {
  // Read the body before any early answer (a large upload would stall the runtime otherwise).
  let body: { item?: unknown; strip2x?: unknown; strip3x?: unknown; color?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  if (!configured()) return json({ configured: false });
  const { item, strip2x, strip3x, color } = body;
  const png = (v: unknown) => typeof v === "string" && v.length > 100 && v.length < MAX_STRIP && /^[A-Za-z0-9+/=]+$/.test(v);
  if (typeof item !== "string" || item.length > 100 || !png(strip2x) || !png(strip3x)) return json({ error: "invalid_input" }, 400);

  const asUser = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return json({ error: "not_authenticated" }, 401);
  // Only one's own shirt (row-level security on custom_items).
  const { data: row } = await asUser.from("custom_items").select("id, catalog_id, proposed_club, proposed_season, proposed_variant, size, flock, version, condition, created_at").eq("id", item).maybeSingle();
  if (!row) return json({ error: "not_found" }, 404);

  const service = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  const { data: cat } = row.catalog_id ? await service.from("catalog_shirts").select("name, season").eq("id", row.catalog_id).maybeSingle() : { data: null };
  const { data: prof } = await service.from("profiles").select("handle").eq("id", user.id).maybeSingle();
  const flock = (row.flock ?? {}) as { name?: string; number?: string; source?: string };
  const print = flock.source && flock.source !== "Keine" ? [flock.name?.toUpperCase(), flock.number].filter(Boolean).join(" ") : "";
  const name = cat?.name ?? ([row.proposed_club, row.proposed_season, row.proposed_variant].filter(Boolean).join(" ") || "Football shirt");
  const grade = typeof (row.condition as { grade?: unknown })?.grade === "number" ? (row.condition as { grade: number }).grade : null;

  const passJson = buildCollectionPassJson(
    {
      itemId: row.id,
      shirtName: name,
      subtitle: [row.proposed_variant || null, cat?.season ?? row.proposed_season ?? null].filter(Boolean).join(" · ") || "Collection",
      size: row.size,
      print: print || null,
      version: row.version,
      grade: grade && grade > 0 ? grade : null,
      handle: prof?.handle ?? null,
      addedAt: row.created_at,
      background: passColor(typeof color === "string" ? color : null),
    },
    { passTypeIdentifier: env("PASS_TYPE_ID"), teamIdentifier: env("APPLE_TEAM_ID"), siteUrl: env("APP_URL") || "https://maillot.app" },
  );
  const files: Record<string, Uint8Array> = {
    "pass.json": new TextEncoder().encode(JSON.stringify(passJson)),
    ...(await brandImages()),
    "strip.png": b64(strip2x as string),
    "strip@2x.png": b64(strip2x as string),
    "strip@3x.png": b64(strip3x as string),
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
  // Stored privately, handed out by a link that expires in ten minutes.
  const path = `${user.id}/${row.id}.pkpass`;
  const up = await service.storage.from("wallet-passes").upload(path, pkpass, { contentType: "application/vnd.apple.pkpass", upsert: true });
  if (up.error) return json({ error: "store_failed" }, 500);
  const signed = await service.storage.from("wallet-passes").createSignedUrl(path, 600);
  if (signed.error || !signed.data) return json({ error: "link_failed" }, 500);
  return json({ configured: true, url: signed.data.signedUrl });
}
