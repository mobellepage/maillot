// Photo → shirt recognition (edge function identify-shirt) and the
// automatic authenticity pre-check (edge function authenticity-check).
import { sb } from '../supabase.ts';
import type { AuthCheck, CheckKind, Claim } from '../../../supabase/functions/authenticity-check/check.ts';
import type { Identification } from '../../../supabase/functions/identify-shirt/identify.ts';

export type { Identification } from '../../../supabase/functions/identify-shirt/identify.ts';
export type IdentifyKind = 'front' | 'back' | 'crest' | 'label';
export type IdentifyResult = { ok: true; result: Identification } | { ok: false; reason: 'off' | 'rate_limited' | 'failed' };

/** Sends up to four compressed photos (data URLs) and returns what's on them. */
export async function identifyShirt(images: { kind: IdentifyKind; dataUrl: string }[], lang: string): Promise<IdentifyResult> {
  const payload = images
    .map(({ kind, dataUrl }) => {
      const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dataUrl);
      return m ? { kind, mediaType: m[1], data: m[2] } : null;
    })
    .filter((x) => !!x);
  if (!payload.length) return { ok: false, reason: 'failed' };
  const { data, error } = await (await sb()).functions.invoke<{ configured?: boolean; result?: Identification }>('identify-shirt', { body: { images: payload, lang }, timeout: 120_000 });
  if (error) {
    const status = (error as { context?: Response }).context?.status;
    return { ok: false, reason: status === 429 ? 'rate_limited' : 'failed' };
  }
  if (data?.configured === false) return { ok: false, reason: 'off' };
  return data?.result ? { ok: true, result: data.result } : { ok: false, reason: 'failed' };
}

// ---------------------------------------------------------------------------
// Automatic authenticity pre-check (edge function authenticity-check).
// ---------------------------------------------------------------------------
export type { AuthCheck, CheckKind, Claim } from '../../../supabase/functions/authenticity-check/check.ts';
export type AuthCheckResult = { ok: true; result: AuthCheck } | { ok: false; reason: 'off' | 'rate_limited' | 'failed' };

/** Sends the storage paths of the member's required photos (their own folder) and what they say the shirt is. */
export async function checkAuthenticity(photos: { kind: CheckKind; path: string }[], claim: Claim, lang: string): Promise<AuthCheckResult> {
  if (!photos.length) return { ok: false, reason: 'failed' };
  const { data, error } = await (await sb()).functions.invoke<{ configured?: boolean; result?: AuthCheck }>('authenticity-check', { body: { photos, claim, lang }, timeout: 120_000 });
  if (error) {
    const status = (error as { context?: Response }).context?.status;
    return { ok: false, reason: status === 429 ? 'rate_limited' : 'failed' };
  }
  if (data?.configured === false) return { ok: false, reason: 'off' };
  return data?.result ? { ok: true, result: data.result } : { ok: false, reason: 'failed' };
}
