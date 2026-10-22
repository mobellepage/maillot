// The picture across the Wallet collector card (the "strip" of a store card,
// 375 × 144 pt): the shirt on its colours, with a holographic sheen. Drawn in
// the browser, sent as PNG at @2x and @3x.
const W = 375;
const H = 144;

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function draw(scale: number, img: HTMLImageElement, colors: [string, string], cutout: boolean): string {
  const c = document.createElement('canvas');
  c.width = W * scale;
  c.height = H * scale;
  const ctx = c.getContext('2d')!;
  ctx.scale(scale, scale);
  // Dark, with the shirt's colours glowing on the right behind it (the left stays dark for the name).
  ctx.fillStyle = '#0d0f0e';
  ctx.fillRect(0, 0, W, H);
  const glow = (x: number, y: number, r: number, col: string, a: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col + Math.round(a * 255).toString(16).padStart(2, '0'));
    g.addColorStop(1, col + '00');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };
  glow(W * 0.78, H * 0.5, W * 0.42, colors[0], 0.7);
  glow(W * 0.35, H, W * 0.4, colors[1], 0.35);
  // Holographic stripes.
  ctx.globalCompositeOperation = 'screen';
  const holo = ctx.createLinearGradient(0, H, W, 0);
  ['rgba(255,0,128,0.18)', 'rgba(255,220,0,0.16)', 'rgba(0,255,160,0.16)', 'rgba(0,160,255,0.18)', 'rgba(190,0,255,0.16)', 'rgba(255,0,128,0.18)'].forEach((col, i, a) => holo.addColorStop(i / (a.length - 1), col));
  ctx.fillStyle = holo;
  ctx.fillRect(0, 0, W, H);
  const glare = ctx.createRadialGradient(W * 0.7, H * 0.2, 4, W * 0.7, H * 0.2, W * 0.55);
  glare.addColorStop(0, 'rgba(255,255,255,0.35)');
  glare.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glare;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  // The shirt on the right.
  const box = H * 0.9;
  const s = Math.min(box / img.width, box / img.height);
  const w = img.width * s, h = img.height * s;
  const x = W - w - 18, y = (H - h) / 2;
  if (cutout) {
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 8;
    ctx.drawImage(img, x, y, w, h);
  } else {
    // A photo: square, rounded.
    const side = Math.min(box, H * 0.86);
    const sx = (img.width - Math.min(img.width, img.height)) / 2, sy = (img.height - Math.min(img.width, img.height)) / 2, ss = Math.min(img.width, img.height);
    const px = W - side - 18, py = (H - side) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(px, py, side, side, 12);
    ctx.clip();
    ctx.drawImage(img, sx, sy, ss, ss, px, py, side, side);
    ctx.restore();
  }
  return c.toDataURL('image/png').split(',')[1]!;
}

export async function renderPassStrip(src: string, colors: [string, string], cutout: boolean): Promise<{ x2: string; x3: string }> {
  const img = await load(src);
  return { x2: draw(2, img, colors, cutout), x3: draw(3, img, colors, cutout) };
}
