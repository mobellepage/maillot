// The studio look: the cut-out shirt centred in a square with room around it,
// on a transparent background — the app draws the tile and the shadow behind
// it, like the catalogue photos, so collections look like one catalogue.
// Drawn in the browser.
export type StudioState = 'idle' | 'working' | 'done' | 'off' | 'limited' | 'failed';

const SIZE = 1200;
const THUMB = 400;

/** Where the shirt goes: fit inside 78 % of the square, a little above centre. */
export function placement(w: number, h: number, size = SIZE) {
  const box = size * 0.78;
  const scale = Math.min(box / w, box / h);
  const dw = w * scale;
  const dh = h * scale;
  return { x: (size - dw) / 2, y: (size - dh) / 2 - size * 0.02, w: dw, h: dh };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('cut-out could not be read'));
    img.src = src;
  });
}

// WebP keeps the transparency and stays small; browsers that can't encode it
// (Safari) hand back PNG instead.
const toBlob = (c: HTMLCanvasElement, q: number) =>
  new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/webp', q));

/** Cut-out PNG → transparent studio image (1200 px) plus a 400 px thumbnail, and a preview data URL. */
export async function composeStudio(cutoutPng: string): Promise<{ blob: Blob; thumb: Blob; dataUrl: string }> {
  const img = await loadImage(cutoutPng);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  const p = placement(img.naturalWidth, img.naturalHeight);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, p.x, p.y, p.w, p.h);

  const small = document.createElement('canvas');
  small.width = small.height = THUMB;
  const sctx = small.getContext('2d')!;
  sctx.imageSmoothingQuality = 'high';
  sctx.drawImage(canvas, 0, 0, THUMB, THUMB);
  const [blob, thumb] = await Promise.all([toBlob(canvas, 0.9), toBlob(small, 0.85)]);
  return { blob, thumb, dataUrl: small.toDataURL('image/webp', 0.85) };
}

/** A studio cut-out (transparent, drawn on the tile) rather than a camera photo. */
export const isCutout = (key: string): boolean => key === 'front_studio';
/** Same, from a stored path: cut-outs are saved as WebP or PNG, camera photos as JPEG. */
export const isCutoutPath = (path: string | null | undefined): boolean => !!path && /\.(webp|png)$/i.test(path);
