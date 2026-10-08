// The studio look: a cut-out shirt centred on MAILLOT's dark background with
// a soft spotlight and shadow — the same for every shirt, so collections look
// like one catalogue. Drawn in the browser.
export type StudioState = 'idle' | 'working' | 'done' | 'off' | 'limited' | 'failed';

const SIZE = 1200;
const THUMB = 400;
const INK = '#0A0C0B';

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

const toBlob = (c: HTMLCanvasElement, q: number) =>
  new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', q));

/** Cut-out PNG → studio JPEG (1200 px) plus a 400 px thumbnail, and a preview data URL. */
export async function composeStudio(cutoutPng: string): Promise<{ blob: Blob; thumb: Blob; dataUrl: string }> {
  const img = await loadImage(cutoutPng);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, SIZE, SIZE);
  const spot = ctx.createRadialGradient(SIZE / 2, SIZE * 0.44, 0, SIZE / 2, SIZE * 0.44, SIZE * 0.62);
  spot.addColorStop(0, 'rgba(255,255,255,0.09)');
  spot.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = spot;
  ctx.fillRect(0, 0, SIZE, SIZE);
  const p = placement(img.naturalWidth, img.naturalHeight);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 28;
  ctx.drawImage(img, p.x, p.y, p.w, p.h);
  ctx.restore();

  const small = document.createElement('canvas');
  small.width = small.height = THUMB;
  small.getContext('2d')!.drawImage(canvas, 0, 0, THUMB, THUMB);
  const [blob, thumb] = await Promise.all([toBlob(canvas, 0.9), toBlob(small, 0.85)]);
  return { blob, thumb, dataUrl: small.toDataURL('image/jpeg', 0.85) };
}
