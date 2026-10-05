// Shirt photos in Supabase Storage (private bucket "vault-photos").
// Objects live under <user id>/<folder>/…; RLS lets owners write their own
// folder and admins read everything for reviews. Display uses short-lived
// signed URLs.
import { supabase } from '../supabase.ts';
import type { Photo } from '../../types/domain.ts';

const BUCKET = 'vault-photos';

export async function uploadPhoto(userId: string, folder: string, key: string, blob: Blob, thumb: Blob): Promise<{ path: string; thumbPath: string }> {
  const base = `${userId}/${folder}/${key}-${Date.now()}`;
  const path = base + '.jpg';
  const thumbPath = base + '_thumb.jpg';
  const [a, b] = await Promise.all([
    supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false, cacheControl: '31536000' }),
    supabase.storage.from(BUCKET).upload(thumbPath, thumb, { contentType: 'image/jpeg', upsert: false, cacheControl: '31536000' })
  ]);
  if (a.error) throw a.error;
  if (b.error) throw b.error;
  return { path, thumbPath };
}

export async function removePhotos(paths: string[]): Promise<void> {
  if (!paths.length) return;
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) throw error;
}

/** path → signed URL (valid for an hour). */
export async function signPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return {};
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(unique, 3600);
  if (error) throw error;
  const out: Record<string, string> = {};
  for (const d of data || []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  return out;
}

/** What gets persisted for a photo: metadata + storage paths, never image bytes. */
export function persistablePhotos(photos: Record<string, Photo>): Record<string, Photo> {
  return Object.fromEntries(Object.entries(photos).map(([k, p]) => [k, p.path ? { ...p, dataUrl: undefined } : p]));
}
