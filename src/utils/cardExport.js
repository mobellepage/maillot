// Real, client-side rendering of a shareable "Vault card" image — drawn directly
// with the Canvas 2D API (no server round-trip, no screenshot library). The result
// is a genuine PNG, pixel-identical in content (not styling) to what gets downloaded.

const W = 800;
const H = 960;

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// CSS gradient strings in data.js (e.g. "linear-gradient(180deg,#F4F4F1 0 31%,...)")
// are too varied to parse exactly; we extract the hex stops and build a close
// top-to-bottom approximation with the real Canvas gradient API.
function extractHexStops(pat) {
  const hexes = (pat.match(/#[0-9a-fA-F]{3,6}/g) || ['#2A302D', '#1A1F1C']);
  return hexes.length > 1 ? [hexes[0], hexes[hexes.length - 1]] : [hexes[0], hexes[0]];
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// data: { name, size, priceFmt, paid, gain, gainC, glowA, trim, crest, pat, badgeLabel, badgeColor }
export function renderVaultCard(data) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  roundRectPath(ctx, 0, 0, W, H, 32);
  ctx.clip();

  ctx.fillStyle = '#0A0C0B';
  ctx.fillRect(0, 0, W, H);

  const photoH = W * 0.78;
  const glow = ctx.createRadialGradient(W / 2, photoH * 0.46, 10, W / 2, photoH * 0.46, photoH * 0.62);
  glow.addColorStop(0, data.glowA || 'rgba(75,255,139,0.3)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, photoH);
  ctx.fillStyle = '#0D100F';
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillRect(0, 0, W, photoH);
  ctx.globalCompositeOperation = 'source-over';

  const [c1, c2] = extractHexStops(data.pat || '');
  const shirtW = W * 0.5;
  const shirtH = shirtW;
  const sx = (W - shirtW) / 2;
  const sy = photoH * 0.22;
  const shirtGrad = ctx.createLinearGradient(0, sy, 0, sy + shirtH);
  shirtGrad.addColorStop(0, c1);
  shirtGrad.addColorStop(1, c2);
  ctx.fillStyle = shirtGrad;
  roundRectPath(ctx, sx, sy, shirtW, shirtH, 36);
  ctx.fill();

  ctx.strokeStyle = data.trim || '#FFFFFF';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(W / 2, sy + shirtH * 0.07, shirtW * 0.115, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  ctx.fillStyle = data.crest || '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(sx + shirtW * 0.61, sy + shirtH * 0.23, shirtW * 0.045, shirtW * 0.055, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = '600 24px "JetBrains Mono Variable","JetBrains Mono",monospace';
  ctx.fillStyle = '#C9D0CB';
  ctx.fillText('SIZE ' + data.size, 28, 44);

  if (data.badgeLabel) {
    ctx.font = '700 20px "JetBrains Mono Variable","JetBrains Mono",monospace';
    const label = data.badgeLabel;
    const padX = 16;
    const textW = ctx.measureText(label).width;
    const pillW = textW + padX * 2;
    const pillX = W - 28 - pillW;
    roundRectPath(ctx, pillX, 24, pillW, 40, 20);
    ctx.fillStyle = (data.badgeColor || '#C9D0CB') + '22';
    ctx.fill();
    ctx.fillStyle = data.badgeColor || '#C9D0CB';
    ctx.fillText(label, pillX + padX, 51);
  }

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#F2F4F1';
  ctx.font = '700 36px "Archivo Variable",Archivo,system-ui,sans-serif';
  const nameLines = wrapText(ctx, data.name || '', W - 56);
  let ny = photoH + 56;
  nameLines.slice(0, 2).forEach((line) => {
    ctx.fillText(line, 28, ny);
    ny += 42;
  });

  ctx.font = '500 20px "JetBrains Mono Variable","JetBrains Mono",monospace';
  ctx.fillStyle = '#8C958F';
  ctx.fillText(data.paid || '', 28, ny + 26);

  ctx.font = '700 46px "JetBrains Mono Variable","JetBrains Mono",monospace';
  ctx.fillStyle = '#F2F4F1';
  ctx.fillText(data.priceFmt || '\u2014', 28, ny + 76);

  if (data.gain) {
    ctx.font = '700 26px "JetBrains Mono Variable","JetBrains Mono",monospace';
    ctx.fillStyle = data.gainC || '#8C958F';
    const w = ctx.measureText(data.gain).width;
    ctx.fillText(data.gain, W - 28 - w, ny + 76);
  }

  ctx.font = '700 22px "Archivo Variable",Archivo,system-ui,sans-serif';
  ctx.fillStyle = '#4BFF8B';
  ctx.fillText('MAILLOT', 28, H - 32);
  ctx.font = '500 16px "JetBrains Mono Variable","JetBrains Mono",monospace';
  ctx.fillStyle = '#6F7872';
  ctx.fillText('maillot.app', W - 28 - ctx.measureText('maillot.app').width, H - 32);

  return canvas;
}

export function downloadVaultCard(data) {
  const canvas = renderVaultCard(data);
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = (data.name || 'maillot-card').replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
