// Deletes the signed-in user's account (App Store requirement; right to
// erasure). Order of operations:
//   1. prepare_account_deletion() as the user — refuses while an order is
//      open, removes shipping addresses, writes the audit entry;
//   2. removes their shirt photos and the shipping labels they created
//      (labels carry their address);
//   3. deletes the auth user — profile, items, bids, asks, watchlist and
//      notifications cascade; completed orders stay for the books, anonymised.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

type Storage = ReturnType<typeof createClient>["storage"];

// Every object under a folder, however deep (Storage lists one level at a time).
async function listAll(storage: Storage, bucket: string, prefix: string): Promise<string[]> {
  const out: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await storage.from(bucket).list(prefix, { limit: 1000, offset });
    if (error) throw error;
    for (const entry of data ?? []) {
      const path = `${prefix}/${entry.name}`;
      if (entry.id) out.push(path);
      else out.push(...(await listAll(storage, bucket, path)));
    }
    if (!data || data.length < 1000) return out;
  }
}

async function removeAll(storage: Storage, bucket: string, paths: string[]) {
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await storage.from(bucket).remove(paths.slice(i, i + 100));
    if (error) throw error;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const asUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return json({ error: "Not authenticated" }, 401);

  const prepared = await asUser.rpc("prepare_account_deletion");
  if (prepared.error) {
    const open = prepared.error.code === "P0409";
    return json({ error: open ? "open_orders" : "prepare_failed", message: prepared.error.message }, open ? 409 : 500);
  }

  const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    await removeAll(service.storage, "vault-photos", await listAll(service.storage, "vault-photos", user.id));
    const { data: labelled } = await service.from("orders").select("id, label_path").eq("seller_id", user.id).not("label_path", "is", null);
    const labels = (labelled ?? []).map((o) => o.label_path as string);
    if (labels.length) {
      await removeAll(service.storage, "shipping-labels", labels);
      await service.from("orders").update({ label_path: null }).in("id", (labelled ?? []).map((o) => o.id));
    }
  } catch (e) {
    console.error("delete-account: storage cleanup failed", e);
    return json({ error: "cleanup_failed" }, 500);
  }

  const { error } = await service.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("delete-account: deleteUser failed", error);
    return json({ error: "delete_failed" }, 500);
  }
  return json({ deleted: true });
});
