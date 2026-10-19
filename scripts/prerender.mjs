// Writes static HTML for the public pages (see src/entry-server.tsx) into
// dist/. dist/app.html (built from app.html, same as index.html) stays an
// empty shell: it's the fallback for every other route (signed-in pages) so
// they never flash another page's content.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const { render, paths, readWithServiceRole } = await import('../dist-ssr/entry-server.js');
// With the service role key (Vercel env SUPABASE_SERVICE_ROLE_KEY, never in the
// app), every club of the library is prerendered; without it, the featured ones.
if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.VITE_SUPABASE_URL) await readWithServiceRole(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
// Every public page, with one per club of the kit library (loaded from the database).
const PATHS = await paths();
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
  // Structured data (application/ld+json) is never executed, so the CSP doesn't apply to it.
  for (const [, body] of page.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)) {
    const hash = `'sha256-${createHash('sha256').update(body).digest('base64')}'`;
    if (!csp.includes(hash)) throw new Error(`prerender: ${path} has an inline script the CSP blocks; add ${hash} to script-src in vercel.json`);
  }
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
// Absolute URLs for link previews, canonical and sitemap: SITE_URL once there's
// a custom domain, else the project's production address Vercel provides.
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL && 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL;
const site = (process.env.SITE_URL || vercelUrl || 'https://maillot.app').replace(/\/$/, '');
// Link previews: each shirt has its own image (npm run brand), everything else the default.
const ogImage = (path) => {
  const own = path.startsWith('/shirt/') && `/og/shirt/${path.slice('/shirt/'.length)}.jpg`;
  return site + (own && existsSync('public' + own) ? own : '/og/default.jpg');
};
// Structured data: absolute URLs, and nothing that could close the script early.
const ldJson = (items, og) =>
  (items ?? []).map((x) => `<script type="application/ld+json">${JSON.stringify(x).replaceAll('{SITE}', site).replaceAll('{OG}', og).replace(/</g, '\\u003c')}</script>`).join('\n    ');
let n = 0;
let skipped = 0;
for (const path of PATHS) {
  const { html, title, description, image, jsonLd, incomplete } = await render(path);
  // Its data didn't load: served by the app at runtime instead of as an empty static page.
  if (incomplete) {
    skipped++;
    continue;
  }
  if (!html.includes('id="main"')) throw new Error('prerender of ' + path + ' rendered no page');
  // A page's own picture (a legend, an era, a club's kit) when it has one.
  const og = image ? site + image : ogImage(path);
  const page = template
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*"/, `$1${esc(description)}"`)
    .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${esc(title)}"`)
    .replace(/(<meta property="og:description" content=")[^"]*"/, `$1${esc(description)}"`)
    .replace(/(<meta property="og:image" content=")[^"]*"/, `$1${og}"`)
    .replace(/(<meta property="og:image:alt" content=")[^"]*"/, `$1${esc(title)}"`)
    .replace('</title>', `</title>\n    <link rel="canonical" href="${site}${path}" />\n    <meta property="og:url" content="${site}${path}" />`)
    .replace('</head>', `    ${ldJson(jsonLd, og)}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${html}</div>`);
  const out = path === '/' ? 'dist/index.html' : `dist${path}/index.html`;
  checkInlineScripts(page, path);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, page);
  n++;
}
// The empty shell for every other route: link previews need an absolute picture too.
writeFileSync('dist/app.html', readFileSync('dist/app.html', 'utf8').replace(/(<meta property="og:image" content=")\/og\/default\.jpg"/, `$1${site}/og/default.jpg"`));

// Search engines: every public page, plus where to find the list.
const today = new Date().toISOString().slice(0, 10);
writeFileSync(
  'dist/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    PATHS.map((p) => `  <url><loc>${site}${p === '/' ? '/' : p}</loc><lastmod>${today}</lastmod></url>`).join('\n') +
    `\n</urlset>\n`
);
// AI training and bulk-data crawlers may not collect Maillot's data
// (prices, values, collections); search engines may index the public pages.
const NO_AI = ['GPTBot', 'ClaudeBot', 'anthropic-ai', 'Claude-Web', 'CCBot', 'Google-Extended', 'Applebot-Extended', 'PerplexityBot', 'Bytespider', 'Amazonbot', 'meta-externalagent', 'FacebookBot', 'Diffbot', 'Omgilibot', 'cohere-ai', 'ImagesiftBot', 'Timpibot', 'DataForSeoBot', 'PetalBot'];
writeFileSync(
  'dist/robots.txt',
  NO_AI.map((ua) => `User-agent: ${ua}\nDisallow: /\n`).join('\n') +
    `\nUser-agent: *\nDisallow: /admin\nDisallow: /vault\nDisallow: /messages\nDisallow: /orders\nDisallow: /account\nDisallow: /watchlist\nDisallow: /welcome\nDisallow: /return\nDisallow: /reset-password\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`
);
console.log(`prerendered ${n} pages${skipped ? ` (${skipped} left to the app: their data didn't load)` : ''}, wrote sitemap.xml and robots.txt`);
