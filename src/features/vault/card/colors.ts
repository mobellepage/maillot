// The two main colours of a shirt picture (for the collector card), read in
// the browser from the picture itself. Needs a CORS-clean image (the app's
// own files or signed storage URLs, which allow it).
export function dominantColors(img: HTMLImageElement): [string, string] | null {
  try {
    const size = 48;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3]! < 200) continue;
      const r = data[i]!, g = data[i + 1]!, b = data[i + 2]!;
      // Skip near-white/grey photo backgrounds; keep the shirt's colours.
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      if (max > 235 && max - min < 18) continue;
      const key = `${r >> 5},${g >> 5},${b >> 5}`;
      const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
      e.n++; e.r += r; e.g += g; e.b += b;
      buckets.set(key, e);
    }
    const top = [...buckets.values()].sort((a, b) => b.n - a.n);
    if (!top.length) return null;
    const hex = (e: { n: number; r: number; g: number; b: number }) => '#' + [e.r, e.g, e.b].map((v) => Math.round(v / e.n).toString(16).padStart(2, '0')).join('');
    const first = top[0]!;
    // The second colour: the next one that is clearly different.
    const far = top.find((e) => Math.abs(e.r / e.n - first.r / first.n) + Math.abs(e.g / e.n - first.g / first.n) + Math.abs(e.b / e.n - first.b / first.n) > 90) ?? first;
    return [hex(first), hex(far)];
  } catch {
    return null;
  }
}
