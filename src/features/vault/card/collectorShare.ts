// The collector card as a picture for chats (WhatsApp, Instagram …): front
// and back of the shirt side by side on its colours, what it is, whose it
// is, and the link that opens it on Maillot. 1080×1350 JPEG, drawn in the browser.
import { fit, roundRect } from '../shareCard.ts';

const W = 1080;
const H = 1350;
const TEXT = '#F2F4F1';
const MUTED = '#A9B1AB';
const ACCENT = '#4BFF8B';

export interface ShareCardModel {
  front: string | undefined;
  frontCutout: boolean;
  back: string | undefined;
  colors: [string, string];
  title: string;
  subtitle: string;
  print: string | null;
  handle: string | null;
  link: string;
  labels: { front: string; back: string };
}

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** One picture in a rounded tile: a photo fills it, a cut-out sits whole on the tile. */
function tile(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, cutout: boolean) {
  ctx.save();
  roundRect(ctx, x, y, w, h, 34);
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.fill();
  ctx.clip();
  if (cutout) {
    const s = Math.min((w * 0.88) / img.width, (h * 0.88) / img.height);
    ctx.drawImage(img, x + (w - img.width * s) / 2, y + (h - img.height * s) / 2, img.width * s, img.height * s);
  } else {
    const s = Math.max(w / img.width, h / img.height);
    ctx.drawImage(img, x + (w - img.width * s) / 2, y + (h - img.height * s) / 2, img.width * s, img.height * s);
  }
  ctx.restore();
  ctx.save();
  roundRect(ctx, x, y, w, h, 34);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.font = '700 24px "Archivo Variable", system-ui, sans-serif';
  const w = ctx.measureText(text).width + 32;
  roundRect(ctx, x, y, w, 44, 22);
  ctx.fillStyle = 'rgba(10,12,11,0.7)';
  ctx.fill();
  ctx.fillStyle = TEXT;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 16, y + 23);
  ctx.textBaseline = 'alphabetic';
}

export async function renderShareCard(m: ShareCardModel): Promise<Blob> {
  const fonts = ['800 64px "Archivo Variable"', '700 24px "Archivo Variable"', '500 30px "JetBrains Mono Variable"'];
  await Promise.all(fonts.map((f) => document.fonts?.load(f).catch(() => undefined)));
  const [front, back] = await Promise.all([m.front ? load(m.front).catch(() => null) : null, m.back ? load(m.back).catch(() => null) : null]);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Dark, with the shirt's colours glowing, and a holographic sheen.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#1a1d1b');
  bg.addColorStop(1, '#0b0c0b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = (x: number, y: number, r: number, col: string, a: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col + Math.round(a * 255).toString(16).padStart(2, '0'));
    g.addColorStop(1, col + '00');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };
  glow(W * 0.3, H * 0.38, W * 0.7, m.colors[0], 0.55);
  glow(W * 0.85, H * 0.85, W * 0.6, m.colors[1], 0.4);
  ctx.globalCompositeOperation = 'screen';
  const holo = ctx.createLinearGradient(0, H, W, 0);
  ['rgba(255,0,128,0.10)', 'rgba(255,220,0,0.08)', 'rgba(0,255,160,0.08)', 'rgba(0,160,255,0.10)', 'rgba(190,0,255,0.08)'].forEach((c, i, a) => holo.addColorStop(i / (a.length - 1), c));
  ctx.fillStyle = holo;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  // The card's edge.
  roundRect(ctx, 24, 24, W - 48, H - 48, 48);
  ctx.strokeStyle = m.colors[0] + 'cc';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = TEXT;
  ctx.font = '800 44px "Archivo Variable", system-ui, sans-serif';
  ctx.fillText('Maillot', 80, 120);

  // Front and back side by side (or the front alone).
  const top = 170;
  const th = 700;
  if (front && back) {
    const tw = (W - 160 - 32) / 2;
    tile(ctx, front, 80, top, tw, th, m.frontCutout);
    tile(ctx, back, 80 + tw + 32, top, tw, th, false);
    label(ctx, m.labels.front, 100, top + 20);
    label(ctx, m.labels.back, 80 + tw + 52, top + 20);
  } else if (front || back) {
    tile(ctx, (front ?? back)!, 80, top, W - 160, th, front ? m.frontCutout : false);
  }

  // What it is, whose it is, and where to see it.
  let y = top + th + 92;
  ctx.fillStyle = TEXT;
  ctx.font = '800 60px "Archivo Variable", system-ui, sans-serif';
  const words = m.title.split(' ');
  const lines: string[] = [];
  for (const w of words) {
    const cur = lines.at(-1);
    if (cur && ctx.measureText(cur + ' ' + w).width <= W - 160) lines[lines.length - 1] = cur + ' ' + w;
    else lines.push(w);
  }
  for (const l of lines.slice(0, 2)) {
    ctx.fillText(fit(ctx, l, W - 160), 80, y);
    y += 70;
  }
  ctx.fillStyle = MUTED;
  ctx.font = '600 34px "Archivo Variable", system-ui, sans-serif';
  if (m.subtitle) ctx.fillText(fit(ctx, m.subtitle, W - 160), 80, y);
  y += 30;
  if (m.print) {
    ctx.font = '800 30px "Archivo Variable", system-ui, sans-serif';
    const w = ctx.measureText(m.print).width + 40;
    roundRect(ctx, 80, y, w, 54, 27);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fill();
    ctx.fillStyle = TEXT;
    ctx.textBaseline = 'middle';
    ctx.fillText(m.print, 100, y + 28);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.font = '500 30px "JetBrains Mono Variable", ui-monospace, monospace';
  ctx.fillStyle = ACCENT;
  ctx.fillText(fit(ctx, m.link.replace(/^https?:\/\//, ''), W - 160), 80, H - 80);
  if (m.handle) {
    ctx.fillStyle = TEXT;
    ctx.font = '700 34px "Archivo Variable", system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('@' + m.handle, W - 80, 120);
    ctx.textAlign = 'left';
  }

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('could not draw the card'))), 'image/jpeg', 0.9));
}
