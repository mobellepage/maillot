// Relays a `notifications` row to the recipient's inbox via Resend.
// Invoked fire-and-forget by the relay_notification() trigger (pg_net), so
// verify_jwt is off. To keep this from being an open mail relay, the body
// carries ONLY the notification id: recipient, subject and text are loaded
// from the database with the service role, the row must be fresh (< 15 min)
// and each row is emailed at most once (emailed_at is claimed atomically).
// Inert-by-design until RESEND_API_KEY is set as a project secret.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { renderEmail } from "./email.ts";

const MAX_AGE_MS = 15 * 60 * 1000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let id: string | undefined;
  try {
    id = (await req.json())?.id;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "id is required" }, 400);

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) return json({ configured: false });

  const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Atomically claim the row: only the first call for a fresh, un-emailed
  // notification gets it back, every replay/forgery gets nothing.
  const freshSince = new Date(Date.now() - MAX_AGE_MS).toISOString();
  const { data: n, error } = await service
    .from("notifications")
    .update({ emailed_at: new Date().toISOString() })
    .eq("id", id)
    .is("emailed_at", null)
    .gte("created_at", freshSince)
    .select("user_id, type, title, body, data")
    .maybeSingle();
  if (error) return json({ error: "lookup failed" }, 500);
  if (!n) return json({ skipped: true });

  const { data: userRes, error: userErr } = await service.auth.admin.getUserById(n.user_id);
  if (userErr || !userRes?.user?.email) return json({ error: "no recipient" }, 404);

  const fromEmail = Deno.env.get("NOTIFICATIONS_FROM_EMAIL") || "Maillot <notifications@maillot.app>";
  const { subject, html, text } = renderEmail({ ...n, appUrl: Deno.env.get("APP_URL") || "" });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: fromEmail, to: userRes.user.email, subject, html, text }),
  });
  if (!res.ok) {
    // Release the claim so a retry can try again.
    await service.from("notifications").update({ emailed_at: null }).eq("id", id);
    return json({ error: "provider error" }, 502);
  }
  return json({ sent: true });
});
