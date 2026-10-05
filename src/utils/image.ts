// Client-side photo helper for the guided upload step.
// Re-encodes the photo onto a canvas (which both compresses it and naturally strips
// EXIF metadata, including GPS location), and runs a lightweight heuristic check for
// resolution and blur so the UI can warn the user before they submit a bad photo.

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Mean luminance 0–255 of a small probe — catches photos that are far too dark or washed out. */
function meanLuminance(ctx: CanvasRenderingContext2D, w: number, h: number): number {
  const { data } = ctx.getImageData(0, 0, w, h);
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) sum += data[i]! * 0.299 + data[i + 1]! * 0.587 + data[i + 2]! * 0.114;
  return sum / (w * h || 1);
}

// Downsampled grayscale variance-of-Laplacian: a standard, simple sharpness estimate.
// Low variance ~= flat/blurry image, high variance ~= lots of crisp edges.
function sharpnessVariance(ctx: CanvasRenderingContext2D, w: number, h: number): number {
  const { data } = ctx.getImageData(0, 0, w, h);
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    gray[i] = data[o]! * 0.299 + data[o + 1]! * 0.587 + data[o + 2]! * 0.114;
  }
  let sum = 0,
    sumSq = 0,
    n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = gray[i - 1]! + gray[i + 1]! + gray[i - w]! + gray[i + w]! - 4 * gray[i]!;
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  if (!n) return 0;
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

export interface CompressOptions {
  maxDim?: number;
  quality?: number;
  minShortSide?: number;
  blurThreshold?: number;
}

export interface CompressedPhoto {
  /** For on-device preview and OCR only — never stored. */
  dataUrl: string;
  /** Re-encoded JPEG (EXIF/GPS stripped), ready to upload. */
  blob: Blob;
  /** ~400px JPEG for lists and thumbnails. */
  thumb: Blob;
  width: number;
  height: number;
  lowRes: boolean;
  blurry: boolean;
  tooDark: boolean;
  tooBright: boolean;
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', quality));
}

export async function analyzeAndCompress(file: Blob, opts: CompressOptions = {}): Promise<CompressedPhoto> {
  const { maxDim = 1600, quality = 0.86, minShortSide = 640, blurThreshold = 18 } = opts;
  const objectUrl = URL.createObjectURL(file);
  let img: HTMLImageElement;
  try {
    img = await loadImage(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.drawImage(img, 0, 0, width, height);

  // Measure sharpness on a small probe canvas for speed.
  const probe = document.createElement('canvas');
  const pScale = Math.min(1, 240 / Math.max(width, height));
  const pw = Math.max(8, Math.round(width * pScale));
  const ph = Math.max(8, Math.round(height * pScale));
  probe.width = pw;
  probe.height = ph;
  const pctx = probe.getContext('2d', { willReadFrequently: true });
  if (!pctx) throw new Error('canvas 2d context unavailable');
  pctx.drawImage(canvas, 0, 0, pw, ph);
  const variance = sharpnessVariance(pctx, pw, ph);
  const luminance = meanLuminance(pctx, pw, ph);

  // Re-encoding through a canvas drops every EXIF field, including GPS.
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const blob = await toBlob(canvas, quality);
  const tScale = Math.min(1, 400 / Math.max(width, height));
  const tc = document.createElement('canvas');
  tc.width = Math.max(1, Math.round(width * tScale));
  tc.height = Math.max(1, Math.round(height * tScale));
  tc.getContext('2d')?.drawImage(canvas, 0, 0, tc.width, tc.height);
  const thumb = await toBlob(tc, 0.8);
  const shortSide = Math.min(img.naturalWidth, img.naturalHeight);

  return {
    dataUrl,
    blob,
    thumb,
    width,
    height,
    lowRes: shortSide < minShortSide,
    blurry: variance < blurThreshold,
    tooDark: luminance < 45,
    tooBright: luminance > 240
  };
}
