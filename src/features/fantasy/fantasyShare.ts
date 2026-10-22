// A picture to share from the game — a pack pull, a completed album, a
// Matchday result, a promotion: up to five cards on the Fantasy look,
// a headline, a line under it, the @handle and maillot.app. 1080×1350
// JPEG, drawn in the browser, handed to the share sheet (or saved).
import { fit, roundRect, shareCard } from '../vault/shareCard.ts';

const W = 1080;
const H = 1350;
const TEXT = '#F2F4F1';
const MUTED = '#A9B1AB';
const ACCENT = '#4BFF8B';
const RARITY: Record<string, string> = { common: '#9aa39d', rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b', gold: '#f3c53d' };

export interface ShareModel {
  kicker: string;
  title: string;
  subtitle?: string;
  stat?: string;
  cards: { src: string | undefined; tone: string; label: string }[];
  handle: string | null;
  link: string;
}

function load(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function renderFantasyShare(m: ShareModel): Promise<Blob> {
  await Promise.all(['800 64px "Archivo Variable"', '700 26px "Archivo Variable"', '500 30px "JetBrains Mono Variable"'].map((f) => document.fonts?.load(f).catch(() => undefined)));
  const imgs = await Promise.all(m.cards.slice(0, 5).map((c) => (c.src ? load(c.src) : Promise.resolve(null))));
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#15291c');
  bg.addColorStop(0.6, '#0b0c0b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.2, H * 0.25, 0, W * 0.2, H * 0.25, W * 0.8);
  glow.addColorStop(0, 'rgba(75,255,139,0.22)');
  glow.addColorStop(1, 'rgba(75,255,139,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'screen';
  const holo = ctx.createLinearGradient(0, H, W, 0);
  ['rgba(255,0,128,0.08)', 'rgba(255,220,0,0.07)', 'rgba(0,255,160,0.07)', 'rgba(0,160,255,0.08)', 'rgba(190,0,255,0.07)'].forEach((c, i, a) => holo.addColorStop(i / (a.length - 1), c));
  ctx.fillStyle = holo;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';

  ctx.fillStyle = TEXT;
  ctx.font = '800 44px "Archivo Variable", system-ui, sans-serif';
  ctx.fillText('Maillot · Fantasy', 80, 120);
  if (m.handle) {
    ctx.textAlign = 'right';
    ctx.font = '700 34px "Archivo Variable", system-ui, sans-serif';
    ctx.fillText('@' + m.handle, W - 80, 120);
    ctx.textAlign = 'left';
  }
  ctx.fillStyle = ACCENT;
  ctx.font = '500 30px "JetBrains Mono Variable", ui-monospace, monospace';
  ctx.fillText(m.kicker.toUpperCase(), 80, 210);
  ctx.fillStyle = TEXT;
  ctx.font = '800 64px "Archivo Variable", system-ui, sans-serif';
  ctx.fillText(fit(ctx, m.title, W - 160), 80, 290);
  if (m.subtitle) {
    ctx.fillStyle = MUTED;
    ctx.font = '600 34px "Archivo Variable", system-ui, sans-serif';
    ctx.fillText(fit(ctx, m.subtitle, W - 160), 80, 345);
  }

  // The cards: up to five in a row (or fewer, larger).
  const n = Math.max(1, Math.min(5, m.cards.length));
  const gap = 18;
  const cw = Math.min(300, (W - 160 - gap * (n - 1)) / n);
  const ch = (cw * 88) / 63;
  const top = 420;
  const left = (W - (cw * n + gap * (n - 1))) / 2;
  m.cards.slice(0, 5).forEach((c, i) => {
    const x = left + i * (cw + gap);
    ctx.save();
    roundRect(ctx, x, top, cw, ch, 22);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fill();
    ctx.clip();
    const img = imgs[i];
    if (img) {
      const s = Math.min((cw * 0.84) / img.width, (ch * 0.64) / img.height);
      ctx.drawImage(img, x + (cw - img.width * s) / 2, top + 24 + (ch * 0.64 - img.height * s) / 2, img.width * s, img.height * s);
    }
    ctx.fillStyle = TEXT;
    ctx.font = `700 ${Math.round(cw / 11)}px "Archivo Variable", system-ui, sans-serif`;
    const lines = c.label.split(' ');
    let line = '';
    let y = top + ch * 0.74;
    for (const w of lines) {
      if (ctx.measureText(line + ' ' + w).width > cw - 28 && line) {
        ctx.fillText(line, x + 14, y);
        y += cw / 9;
        line = w;
      } else line = line ? line + ' ' + w : w;
    }
    ctx.fillText(fit(ctx, line, cw - 28), x + 14, y);
    ctx.restore();
    ctx.save();
    roundRect(ctx, x, top, cw, ch, 22);
    ctx.strokeStyle = RARITY[c.tone] ?? RARITY.common!;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
  });

  if (m.stat) {
    ctx.fillStyle = ACCENT;
    ctx.font = '800 96px "Archivo Variable", system-ui, sans-serif';
    ctx.fillText(fit(ctx, m.stat, W - 160), 80, H - 170);
  }
  ctx.fillStyle = MUTED;
  ctx.font = '500 30px "JetBrains Mono Variable", ui-monospace, monospace';
  ctx.fillText(m.link.replace(/^https?:\/\//, ''), 80, H - 80);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('could not draw'))), 'image/jpeg', 0.9));
}

/** Draws and shares (or saves) in one go. */
export async function shareFantasy(m: ShareModel, text: string): Promise<'shared' | 'downloaded'> {
  const blob = await renderFantasyShare(m);
  return shareCard(blob, text + '\n' + m.link, 'maillot-fantasy.jpg');
}
