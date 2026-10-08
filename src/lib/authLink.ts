/** An error Supabase put into a sign-up / password link's fragment: expired (or used) vs anything else. */
export function authLinkError(hash: string): 'expired' | 'failed' | null {
  if (!/(^#|&)error=/.test(hash)) return null;
  return /error_code=otp_expired/.test(hash) ? 'expired' : 'failed';
}
