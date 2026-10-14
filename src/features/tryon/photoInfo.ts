// Measures a shirt photo in the browser so the try-on can stretch it onto
// the figure: where the shirt sits in the picture (the non-transparent /
// non-background area) and its main colour (to fill gaps under the photo).
import { useEffect, useState } from 'react';

export interface PhotoInfo {
  /** The shirt's box in the photo, as fractions (0..1) of its width and height. */
  box: { l: number; t: number; r: number; b: number };
  /** Average colour of the chest, #rrggbb. */
  base: string;
}

const cache = new Map<string, PhotoInfo | null>();
const N = 120;

/** Pure part (unit-tested): find the shirt and its colour in RGBA pixels of an N×N image. */
export function measure(data: Uint8ClampedArray, n: number): PhotoInfo | null {
  // Background: transparent pixels, or (for photos without cut-out) pixels
  // close to the corner colour.
  const at = (x: number, y: number) => (y * n + x) * 4;
  const c0 = at(1, 1);
  const bg = [data[c0]!, data[c0 + 1]!, data[c0 + 2]!];
  const opaqueBg = data[c0 + 3]! > 200;
  const isShirt = (i: number) => {
    if (data[i + 3]! < 60) return false;
    if (!opaqueBg) return true;
    return Math.abs(data[i]! - bg[0]!) + Math.abs(data[i + 1]! - bg[1]!) + Math.abs(data[i + 2]! - bg[2]!) > 60;
  };
  let l = n, t = n, r = -1, b = -1;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      if (isShirt(at(x, y))) {
        if (x < l) l = x;
        if (x > r) r = x;
        if (y < t) t = y;
        if (y > b) b = y;
      }
  if (r < l || b < t || (r - l) * (b - t) < n * n * 0.05) return null;
  let sr = 0, sg = 0, sb = 0, k = 0;
  for (let y = Math.round(t + (b - t) * 0.4); y < t + (b - t) * 0.75; y++)
    for (let x = Math.round(l + (r - l) * 0.35); x < l + (r - l) * 0.65; x++) {
      const i = at(x, y);
      if (!isShirt(i)) continue;
      sr += data[i]!;
      sg += data[i + 1]!;
      sb += data[i + 2]!;
      k++;
    }
  const hex = (v: number) => Math.round(v / Math.max(1, k)).toString(16).padStart(2, '0');
  return { box: { l: l / n, t: t / n, r: (r + 1) / n, b: (b + 1) / n }, base: '#' + hex(sr) + hex(sg) + hex(sb) };
}

export function usePhotoInfo(url: string | undefined): PhotoInfo | null {
  const [info, setInfo] = useState<{ url: string; info: PhotoInfo | null } | null>(() => (url && cache.has(url) ? { url, info: cache.get(url)! } : null));
  useEffect(() => {
    if (!url || cache.has(url)) return;
    let live = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let result: PhotoInfo | null = null;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = N;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(img, 0, 0, N, N);
          result = measure(ctx.getImageData(0, 0, N, N).data, N);
        }
      } catch {
        result = null; // tainted canvas or no 2D context: fall back to the default fit
      }
      cache.set(url, result);
      if (live) setInfo({ url, info: result });
    };
    img.onerror = () => {
      cache.set(url, null);
      if (live) setInfo({ url, info: null });
    };
    img.src = url;
    return () => {
      live = false;
    };
  }, [url]);
  if (!url) return null;
  if (info?.url === url) return info.info;
  return cache.get(url) ?? null;
}

/** CSS background size/position that maps the shirt's box in the photo onto the whole element. */
export function stretch(b: PhotoInfo['box']) {
  const w = 1 / Math.max(0.05, b.r - b.l); // photo width in element widths
  const h = 1 / Math.max(0.05, b.b - b.t);
  const px = w === 1 ? 0 : ((-b.l * w) / (1 - w)) * 100;
  const py = h === 1 ? 0 : ((-b.t * h) / (1 - h)) * 100;
  return { backgroundSize: `${w * 100}% ${h * 100}%`, backgroundPosition: `${px}% ${py}%` };
}

