// The member's own account: what blocks deleting it, and deleting it.
import { sb } from '../supabase.ts';

/** Orders where money or a shirt is still in transit — these must finish first. */
export async function accountDeletionBlockers(): Promise<number> {
  const { data, error } = await (await sb()).rpc('account_deletion_blockers');
  if (error) throw error;
  return data?.[0]?.open_orders ?? 0;
}

export type DeleteAccountResult = { deleted: true } | { deleted: false; reason: 'open_orders' | 'failed' };

/** Deletes the account for good (edge function delete-account), then signs out locally. */
export async function deleteAccount(): Promise<DeleteAccountResult> {
  const client = await sb();
  const { data, error } = await client.functions.invoke<{ deleted?: boolean; error?: string }>('delete-account', { body: {} });
  if (error) {
    // Non-2xx: the body says why (409 = open orders).
    const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
    return { deleted: false, reason: body?.error === 'open_orders' ? 'open_orders' : 'failed' };
  }
  if (!data?.deleted) return { deleted: false, reason: 'failed' };
  // The user no longer exists; drop the local session without a server call.
  await client.auth.signOut({ scope: 'local' }).catch(() => {});
  return { deleted: true };
}
