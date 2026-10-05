// Resolves stored photo paths to short-lived signed URLs (cached ~50 min,
// under the 60-minute signature lifetime). Photos that still carry inline
// data (local previews, legacy rows) are shown as-is.
import { useQuery } from '@tanstack/react-query';
import type { Photo } from '../types/domain.ts';
import { signPhotoUrls } from '../utils/db.ts';

export function usePhotoUrls(photos: (Photo | undefined)[], thumbs = false) {
  const paths = photos.map((p) => (p ? (thumbs ? p.thumbPath || p.path : p.path) : undefined)).filter((x): x is string => !!x).sort();
  const q = useQuery({ queryKey: ['photoUrls', paths], enabled: paths.length > 0, queryFn: () => signPhotoUrls(paths), staleTime: 50 * 60 * 1000 });
  return (p: Photo | undefined): string | undefined => {
    if (!p) return undefined;
    if (p.dataUrl) return p.dataUrl;
    const path = thumbs ? p.thumbPath || p.path : p.path;
    return path ? q.data?.[path] : undefined;
  };
}
