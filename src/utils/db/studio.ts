// Studio photo: the shirt cut out of the main photo (edge function studio-photo).
import { sb } from '../supabase.ts';

export type CutoutResult = { ok: true; png: string } | { ok: false; reason: 'off' | 'rate_limited' | 'failed' };

/** Sends the compressed main photo (JPEG data URL); returns the cut-out as a PNG data URL. */
export async function cutoutShirt(jpegDataUrl: string): Promise<CutoutResult> {
  const m = /^data:image\/jpeg;base64,(.+)$/.exec(jpegDataUrl);
  if (!m) return { ok: false, reason: 'failed' };
  const { data, error } = await (await sb()).functions.invoke<{ configured?: boolean; png?: string }>('studio-photo', { body: { image: m[1] } });
  if (error) return { ok: false, reason: (error as { context?: Response }).context?.status === 429 ? 'rate_limited' : 'failed' };
  if (data?.configured === false) return { ok: false, reason: 'off' };
  return data?.png ? { ok: true, png: 'data:image/png;base64,' + data.png } : { ok: false, reason: 'failed' };
}
