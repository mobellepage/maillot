// Private partner demo: reads a Shopify shop's public product feed and writes
// its shirts, mapped to Maillot's listing fields, to public/demo/partner.json
// for the dev-only page /demo/partner. The output stays on this machine
// (public/demo/ is git-ignored and the page only exists in `npm run dev`):
// the shop's photos and texts are theirs, so nothing here is published
// before a partnership is agreed.
//
//   node scripts/partner-demo.mjs <shop-domain> "<Shop name>" [studio-count]
//
// With a studio count > 0 (macOS only), that many shirts also get the studio
// look via scripts/catalog-studio.swift, saved next to the JSON.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const [domain, shopName = domain, studioArg = '0'] = process.argv.slice(2);
if (!domain) {
  console.error('usage: node scripts/partner-demo.mjs <shop-domain> "<Shop name>" [studio-count]');
  process.exit(2);
}
const OUT = 'public/demo';
const UA = { 'User-Agent': 'Maillot partner demo (private preview)' };

// The shop's "Produktdetails" block: label → field. Labels appear in this order.
const LABELS = [
  ['Grösse', 'size'],
  ['Schnitt / Grösse', 'cut'],
  ['Marke', 'brand'],
  ['Club / Nation', 'club'],
  ['Teamtyp', 'teamType'],
  ['Wettbewerb (Patch)', 'competition'],
  ['Jahr', 'season'],
  ['Produkttyp', 'productType'],
  ['Art (Heim / Auswärts)', 'kit'],
  ['Farbe', 'colours'],
  ['Zustand Kategorie', 'conditionClass'],
  ['Zustand', 'condition'],
  ['Zustand numerisch', 'grade'],
  ['Nutzung', 'usage'],
  ['Signiert', 'signed'],
  ['Rücken', 'back'],
  ['Spielername', 'playerName'],
  ['Rückennummer', 'playerNumber'],
  ['SKU', 'sku']
];

export function parseDetails(html) {
  const text = (html || '').replace(/<[^>]+>/g, '\n').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  const out = {};
  // Longest labels first so "Zustand numerisch" isn't read as "Zustand".
  const pattern = new RegExp('(' + LABELS.map(([l]) => l.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')).sort((a, b) => b.length - a.length).join('|') + '):', 'g');
  const hits = [...text.matchAll(pattern)];
  hits.forEach((m, i) => {
    const field = LABELS.find(([l]) => l === m[1])?.[1];
    const end = i + 1 < hits.length ? hits[i + 1].index : text.length;
    const value = text.slice(m.index + m[0].length, end).trim();
    if (field && value && !(field in out)) out[field] = value;
  });
  return out;
}

async function feed() {
  const all = [];
  for (let page = 1; page <= 100; page++) {
    const res = await fetch(`https://${domain}/products.json?limit=250&page=${page}`, { headers: UA });
    if (!res.ok) throw new Error(`feed page ${page}: HTTP ${res.status}`);
    const { products } = await res.json();
    if (!products?.length) break;
    all.push(...products);
    await new Promise((r) => setTimeout(r, 600)); // be gentle with their shop
  }
  return all;
}

const isShirt = (p) => /trikot/i.test(p.product_type || '') || (p.tags || []).some((t) => /^trikot/i.test(t));

const products = await feed();
const shirts = products
  .filter(isShirt)
  .filter((p) => p.variants?.some((v) => v.available))
  .map((p) => {
    const d = parseDetails(p.body_html);
    const grade = Number(/(\d+(?:[.,]\d)?)\s*\/\s*10/.exec(d.grade || '')?.[1]?.replace(',', '.'));
    return {
      id: String(p.id),
      title: p.title,
      club: d.club || null,
      season: d.season || null,
      kit: d.kit || null,
      size: d.size || null,
      brand: d.brand || p.vendor || null,
      player: [d.playerName, d.playerNumber && '#' + d.playerNumber].filter(Boolean).join(' ') || null,
      grade: Number.isFinite(grade) ? grade : null,
      condition: d.condition || null,
      signed: /^ja/i.test(d.signed || ''),
      price: Number(p.variants[0].price),
      images: (p.images || []).slice(0, 4).map((i) => i.src),
      url: `https://${domain}/products/${p.handle}`,
      addedAt: p.published_at || p.created_at
    };
  })
  .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));

mkdirSync(OUT, { recursive: true });

// Studio look for the first N (newest) shirts — the same treatment members' photos get.
const studioCount = Math.min(Number(studioArg) || 0, shirts.length);
if (studioCount > 0) {
  const bin = path.join(tmpdir(), 'maillot-catalog-studio');
  if (!existsSync(bin)) execFileSync('swiftc', ['-O', '-o', bin, 'scripts/catalog-studio.swift'], { stdio: 'inherit' });
  mkdirSync(path.join(OUT, 'studio'), { recursive: true });
  const work = path.join(tmpdir(), 'maillot-partner-demo');
  mkdirSync(work, { recursive: true });
  for (const s of shirts.slice(0, studioCount)) {
    try {
      const res = await fetch(s.images[0].replace(/(\?v=\d+)?$/, (q) => (q ? q + '&' : '?') + 'width=1200'), { headers: UA });
      const src = path.join(work, s.id + '.img');
      writeFileSync(src, Buffer.from(await res.arrayBuffer()));
      execFileSync(bin, [src, path.join(OUT, 'studio', s.id + '.jpg'), '800'], { stdio: 'ignore' });
      s.studio = `/demo/studio/${s.id}.jpg`;
    } catch (e) {
      console.warn('studio look failed for', s.title, e.message);
    }
  }
}

const prices = shirts.map((s) => s.price).sort((a, b) => a - b);
writeFileSync(
  path.join(OUT, 'partner.json'),
  JSON.stringify({ shop: shopName, domain, fetchedAt: new Date().toISOString(), totalProducts: products.length, medianPrice: prices[Math.floor(prices.length / 2)] ?? 0, shirts }, null, 1)
);
console.log(`${shopName}: ${products.length} products, ${shirts.length} shirts in stock → ${OUT}/partner.json` + (studioCount ? `, ${studioCount} in the studio look` : ''));
