// A shareable picture of a collection (1080×1350, Instagram portrait): total
// value, number of shirts, the three most valuable ones. Drawn on a canvas in
// the browser — nothing is uploaded — and shared through the system share
// sheet where there is one (phones, the iOS app), downloaded elsewhere.

export interface CardShirt {
  name: string;
  valueText: string;
  color: string;
}
export interface CardModel {
  eyebrow: string;
  total: string;
  count: string;
  shirts: CardShirt[];
  footer: string;
  site: string;
}

const W = 1080;
const H = 1350;
const INK = '#0A0C0B';
const ACCENT = '#4BFF8B';
const TEXT = '#F2F4F1';
const MUTED = '#8C958F';

/** First solid colour in a CSS background (the shirt's main colour), else the accent. */
export function mainColor(background: string): string {
  return /#[0-9a-f]{6}\b|#[0-9a-f]{3}\b|rgba?\([^)]*\)/i.exec(background)?.[0] ?? ACCENT;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** The shirt outline used across MAILLOT (same proportions as ShirtGraphic). */
function shirt(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const p = [[31, 5], [39, 3], [50, 9], [61, 3], [69, 5], [97, 21], [88, 41], [78, 35], [78, 97], [22, 97], [22, 35], [12, 41], [3, 21]];
  ctx.beginPath();
  p.forEach(([px, py], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, x + (px! / 100) * size, y + (py! / 100) * size));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + '…').width > max) s = s.slice(0, -1);
  return s + '…';
}

export async function renderCard(m: CardModel): Promise<Blob> {
  const fonts = ['800 150px "Archivo Variable"', '600 40px "Archivo Variable"', '500 30px "JetBrains Mono Variable"'];
  await Promise.all(fonts.map((f) => document.fonts?.load(f).catch(() => undefined)));
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.85, H * 0.2, 0, W * 0.85, H * 0.2, W * 0.8);
  glow.addColorStop(0, 'rgba(75,255,139,0.22)');
  glow.addColorStop(1, 'rgba(75,255,139,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Logo
  roundRect(ctx, 80, 80, 72, 72, 20);
  ctx.fillStyle = ACCENT;
  ctx.fill();
  ctx.save();
  ctx.translate(116, 116);
  ctx.rotate(Math.PI / 4);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6.5;
  roundRect(ctx, -13, -13, 26, 26, 3);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = TEXT;
  ctx.font = '800 52px "Archivo Variable", system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('MAILLOT', 176, 118);

  // Value
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = ACCENT;
  ctx.font = '500 30px "JetBrains Mono Variable", ui-monospace, monospace';
  ctx.fillText(m.eyebrow.toUpperCase(), 80, 330);
  ctx.fillStyle = TEXT;
  ctx.font = '800 150px "Archivo Variable", system-ui, sans-serif';
  ctx.fillText(fit(ctx, m.total, W - 160), 80, 480);
  ctx.fillStyle = MUTED;
  ctx.font = '600 40px "Archivo Variable", system-ui, sans-serif';
  ctx.fillText(m.count, 80, 550);

  // Top shirts
  m.shirts.slice(0, 3).forEach((s, i) => {
    const y = 650 + i * 170;
    roundRect(ctx, 80, y, W - 160, 140, 28);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fill();
    shirt(ctx, 110, y + 22, 96, s.color);
    ctx.fillStyle = TEXT;
    ctx.font = '600 40px "Archivo Variable", system-ui, sans-serif';
    ctx.fillText(fit(ctx, s.name, W - 160 - 180 - 230), 236, y + 84);
    ctx.font = '500 34px "JetBrains Mono Variable", ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(s.valueText, W - 112, y + 84);
    ctx.textAlign = 'left';
  });

  // Footer
  ctx.fillStyle = MUTED;
  ctx.font = '600 34px "Archivo Variable", system-ui, sans-serif';
  ctx.fillText(m.footer, 80, H - 130);
  ctx.fillStyle = ACCENT;
  ctx.font = '500 30px "JetBrains Mono Variable", ui-monospace, monospace';
  ctx.fillText(m.site, 80, H - 80);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('could not draw the card'))), 'image/png'));
}

/** Share sheet with the picture where supported, otherwise a download. */
export async function shareCard(blob: Blob, text: string): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], 'maillot-collection.png', { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], text });
    return 'shared';
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: file.name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
