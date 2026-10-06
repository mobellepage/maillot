// Writes static HTML for the public pages (see src/entry-server.tsx) into
// dist/. dist/app.html (built from app.html, same as index.html) stays an
// empty shell: it's the fallback for every other route (signed-in pages) so
// they never flash another page's content.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const { render, PATHS } = await import('../dist-ssr/entry-server.js');
// Prerendered pages already show their content, so nothing may delay the
// first paint: the stylesheet is inlined, and the app's JavaScript is
// fetched at low priority without preloads (React takes over shortly after).
const template = readFileSync('dist/index.html', 'utf8')
  .replace(/<link rel="stylesheet" crossorigin href="(\/assets\/[^"]+\.css)">/g, (_, href) => `<style>${readFileSync('dist' + href, 'utf8')}</style>`)
  .replace(/\s*<link rel="modulepreload" crossorigin href="[^"]+">/g, '')
  .replaceAll('<script type="module" crossorigin src=', '<script type="module" crossorigin fetchpriority="low" src=');
if (template.includes('rel="stylesheet"') || template.includes('modulepreload')) throw new Error('prerender: template changed shape; update the rewrites above');

// vercel.json's Content-Security-Policy allows inline scripts only by hash.
// React adds small inline scripts of its own (Suspense reveal); if a React
// update changes them, fail the build here rather than ship pages the CSP blocks.
const csp = JSON.parse(readFileSync('vercel.json', 'utf8'))
  .headers.flatMap((h) => h.headers)
  .find((h) => h.key === 'Content-Security-Policy').value;
const checkInlineScripts = (page, path) => {
  for (const [, body] of page.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
    const hash = `'sha256-${createHash('sha256').update(body).digest('base64')}'`;
    if (!csp.includes(hash)) throw new Error(`prerender: ${path} has an inline script the CSP blocks; add ${hash} to script-src in vercel.json`);
  }
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
let n = 0;
for (const path of PATHS) {
  const { html, title, description } = await render(path);
  if (!html.includes('id="main"')) throw new Error('prerender of ' + path + ' rendered no page');
  const page = template
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*"/, `$1${esc(description)}"`)
    .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${esc(title)}"`)
    .replace(/(<meta property="og:description" content=")[^"]*"/, `$1${esc(description)}"`)
    .replace('<div id="root"></div>', `<div id="root">${html}</div>`);
  const out = path === '/' ? 'dist/index.html' : `dist${path}/index.html`;
  checkInlineScripts(page, path);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, page);
  n++;
}
// Search engines: every public page, plus where to find the list.
const site = (process.env.SITE_URL || 'https://maillot.app').replace(/\/$/, '');
const today = new Date().toISOString().slice(0, 10);
writeFileSync(
  'dist/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    PATHS.map((p) => `  <url><loc>${site}${p === '/' ? '/' : p}</loc><lastmod>${today}</lastmod></url>`).join('\n') +
    `\n</urlset>\n`
);
writeFileSync('dist/robots.txt', `User-agent: *\nDisallow: /admin\nDisallow: /vault\nDisallow: /orders\nDisallow: /welcome\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`);
console.log(`prerendered ${n} pages, wrote sitemap.xml and robots.txt`);
