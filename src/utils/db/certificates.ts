// Certificates of authenticity: public verification, the buyer's own
// certificates, and the admin tag/revoke actions.
import { supabase } from '../supabase.ts';
import type { RpcReturns } from '../../types/database.ts';

export type VerifiedCertificate = RpcReturns<'verify_certificate'>[number];

export async function verifyCertificate(code: string, tag?: string | null): Promise<VerifiedCertificate | null> {
  const { data, error } = await supabase.rpc('verify_certificate', tag ? { p_code: code, p_tag: tag } : { p_code: code });
  if (error) throw error;
  return data?.[0] ?? null;
}

/** order_id -> certificate code, for the signed-in buyer (RLS limits rows to their purchases). */
export async function loadMyCertificateCodes(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('certificates').select('code, order_id');
  if (error) throw error;
  return Object.fromEntries((data ?? []).filter((c) => c.order_id).map((c) => [c.order_id as string, c.code]));
}

export async function attachCertificateTag(code: string, uid: string): Promise<void> {
  const { error } = await supabase.rpc('admin_attach_tag', { p_code: code, p_uid: uid });
  if (error) throw error;
}

export async function revokeCertificate(code: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('admin_revoke_certificate', { p_code: code, p_reason: reason });
  if (error) throw error;
}
