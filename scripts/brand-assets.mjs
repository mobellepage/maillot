// Generates the brand's raster assets from one source of truth: the app
// icon (brand/app-icon.webp — a white shirt-"M" on a green rounded tile,
// 1254 px with a white margin) and the app's own fonts, styles and shirt
// illustrations.
//
//   npm run build && npm run brand
//
// Writes (and the repo commits) public/favicon.png, public/icons/*.png,
// public/og/*.jpg, the iOS icon and splash, and the Wallet pass images.
// Re-run after changing the icon or adding catalogue shirts; shirts without
// a preview image fall back to og/default.jpg (prerender.mjs).
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium } from '@playwright/test';

const ACCENT = '#4BFF8B';
const INK = '#0A0C0B';

// The icon source and where its green tile sits in it (pixels of the 1254 px source).
const SOURCE = 'data:image/webp;base64,' + readFileSync('brand/app-icon.webp').toString('base64');
const SRC = 1254;
const TILE = { at: 94, size: 1068 }; // the whole rounded tile
const BLEED = { at: 188, size: 878 }; // a square inside it, clear of the rounded corners

// `bleed` fills the whole square edge to edge (Apple / maskable icons: the OS
// rounds it); otherwise the rounded tile on a transparent background.
const mark = (size, { bleed = false } = {}) => {
  const r = bleed ? BLEED : TILE;
  const k = size / r.size;
  return `<div style="position:relative;width:${size}px;height:${size}px;overflow:hidden;flex:none;${bleed ? '' : 'border-radius:25%'}"><img src="${SOURCE}" alt="" style="position:absolute;display:block;max-width:none;width:${SRC * k}px;height:${SRC * k}px;left:${-r.at * k}px;top:${-r.at * k}px"></div>`;
};

mkdirSync('public/icons', { recursive: true });
mkdirSync('public/og/shirt', { recursive: true });

// Serve dist/ so pages get the real CSS and fonts; /__brand serves the page under test.
const css = readdirSync('dist/assets').filter((f) => f.endsWith('.css'));
const types = { '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
let current = '';
const server = createServer((req, res) => {
  if (req.url === '/__brand') return res.end(current);
  const file = join('dist', decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(file)) return res.writeHead(404).end();
  res.setHeader('content-type', types[extname(file)] || 'application/octet-stream');
  res.end(readFileSync(file));
}).listen(0);
const base = `http://localhost:${server.address().port}`;

const browser = await chromium.launch();
const page = await browser.newPage();
async function shoot(body, width, height, path, opts = {}) {
  current = `<!doctype html><html><head><meta charset="utf-8">${css.map((f) => `<link rel="stylesheet" href="/assets/${f}">`).join('')}
    <style>html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden;background:${opts.transparent ? 'transparent' : (opts.bg ?? INK)}}</style></head><body>${body}</body></html>`;
  await page.setViewportSize({ width, height });
  await page.goto(base + '/__brand');
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))));
  await page.screenshot({ path, type: path.endsWith('.jpg') ? 'jpeg' : 'png', quality: path.endsWith('.jpg') ? 86 : undefined, omitBackground: !!opts.transparent });
}

// Favicon and app icons.
await shoot(mark(64), 64, 64, 'public/favicon.png', { transparent: true });
await shoot(mark(192), 192, 192, 'public/icons/icon-192.png', { transparent: true });
await shoot(mark(512), 512, 512, 'public/icons/icon-512.png', { transparent: true });
await shoot(mark(512, { bleed: true }), 512, 512, 'public/icons/maskable-512.png');
await shoot(mark(180, { bleed: true }), 180, 180, 'public/icons/apple-touch-icon.png');

// iOS app (ios/): App Store icon — square, opaque, iOS rounds it — and the
// launch screen (the icon centred on white; one image serves every scale).
if (existsSync('ios/App/App/Assets.xcassets')) {
  await shoot(mark(1024, { bleed: true }), 1024, 1024, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
  const splash = 'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png';
  await shoot(`<div style="width:2732px;height:2732px;display:grid;place-items:center">${mark(300)}</div>`, 2732, 2732, splash, { bg: '#FFFFFF' });
  for (const n of [1, 2]) writeFileSync(splash.replace('.png', `-${n}.png`), readFileSync(splash));
}

// Apple Wallet certificate pass (supabase/functions/wallet-pass): icon and
// logo strip, embedded as base64 because edge functions deploy as text.
{
  const shots = {};
  for (const [name, size] of [['icon.png', 29], ['icon@2x.png', 58], ['icon@3x.png', 87]]) {
    const path = `dist/__pass-${name}`;
    await shoot(mark(size, { bleed: true }), size, size, path);
    shots[name] = readFileSync(path).toString('base64');
  }
  for (const [name, w, h] of [['logo.png', 160, 50], ['logo@2x.png', 320, 100]]) {
    const path = `dist/__pass-${name}`;
    const s = h / 50;
    await shoot(`<div style="display:flex;align-items:center;gap:${8 * s}px;height:${h}px">${mark(30 * s)}<span style="font-weight:800;font-stretch:78%;font-size:${22 * s}px;letter-spacing:.03em;color:#F2F4F1">MAILLOT</span></div>`, w, h, path, { transparent: true });
    shots[name] = readFileSync(path).toString('base64');
  }
  writeFileSync(
    'supabase/functions/wallet-pass/images.ts',
    '// Generated by scripts/brand-assets.mjs — do not edit.\n' + Object.entries(shots).map(([n, b]) => `export const ${n.replace(/[@.]/g, '_')} = "${b}";`).join('\n') + '\n'
  );
}

// Link previews (1200×630).
const { shirtArt, PATHS } = await import('../dist-ssr/entry-server.js');
const logo = `<div style="display:flex;align-items:center;gap:16px">${mark(52)}<span style="font-weight:800;font-stretch:78%;font-size:40px;letter-spacing:.03em;color:var(--text)">MAILLOT</span></div>`;
const shirtBox = (a, size, extra = '') =>
  `<div style="position:relative;width:${size}px;height:${size}px;display:grid;place-items:center;${extra}"><div style="width:78%">${a.html}</div></div>`;

const featured = ['bra-70', 'ned-88', 'boc-81'].filter((id) => PATHS.includes('/shirt/' + id)).map(shirtArt);
await shoot(
  `<div style="position:relative;width:1200px;height:630px;background:radial-gradient(circle at 78% 50%,rgba(75,255,139,.16),rgba(0,0,0,0) 55%),${INK};font-family:var(--font-sans);color:var(--text)">
    <div style="position:absolute;left:72px;top:64px">${logo}</div>
    <div style="position:absolute;left:72px;top:190px;width:600px">
      <div class="display" style="font-size:84px;line-height:.95;font-weight:800">Your collection,<br><span style="color:${ACCENT}">in your pocket.</span></div>
      <div style="margin-top:28px;font-size:24px;line-height:1.4;color:var(--text-2)">Photograph, value and show off every football shirt you own.</div>
    </div>
    <div style="position:absolute;right:20px;top:90px;width:520px;height:460px">
      ${featured.map((a, i) => `<div style="position:absolute;left:${[0, 170, 80][i]}px;top:${[40, 0, 170][i]}px;transform:rotate(${[-8, 6, 0][i]}deg)">${shirtBox(a, [300, 300, 320][i])}</div>`).join('')}
    </div>
    <div class="mono" style="position:absolute;left:72px;bottom:52px;font-size:20px;color:var(--muted);letter-spacing:.08em">MAILLOT-TWO.VERCEL.APP</div>
  </div>`,
  1200,
  630,
  'public/og/default.jpg'
);

let n = 0;
for (const path of PATHS.filter((p) => p.startsWith('/shirt/'))) {
  const a = shirtArt(path.slice('/shirt/'.length));
  await shoot(
    `<div style="position:relative;width:1200px;height:630px;background:${INK};font-family:var(--font-sans);color:var(--text)">
      <div style="position:absolute;left:0;top:0;width:600px;height:630px;background:radial-gradient(circle at 50% 50%,${a.glow} 0%,rgba(0,0,0,0) 62%),var(--sunken);display:grid;place-items:center">${shirtBox(a, 520)}</div>
      <div style="position:absolute;left:660px;top:64px">${logo}</div>
      <div style="position:absolute;left:660px;right:64px;top:200px">
        <div class="mono" style="font-size:20px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${a.brand} · ${a.season} · ${a.type}</div>
        <div class="display" style="margin-top:16px;font-size:64px;line-height:.98;font-weight:800">${a.name}</div>
      </div>
      <div style="position:absolute;left:660px;bottom:64px;display:inline-flex;align-items:center;gap:10px;padding:12px 18px;border-radius:999px;border:1.5px solid var(--accent-line);color:${ACCENT};font-size:20px;font-weight:600">✓ Value · price history · offers</div>
    </div>`,
    1200,
    630,
    `public/og/shirt/${a.id}.jpg`
  );
  n++;
}

await browser.close();
server.close();
console.log(`wrote favicon.png, 4 icons (+ iOS icon and splash), og/default.jpg and ${n} shirt previews`);
