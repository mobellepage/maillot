import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '../..');
const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
const csp = vercel.headers.find((h) => h.source === '/(.*)').headers.find((h) => h.key === 'Content-Security-Policy').value;

describe('security headers', () => {
  it('allow exactly the inline script in index.html and app.html', () => {
    for (const file of ['index.html', 'app.html']) {
      const inline = /<script>([\s\S]*?)<\/script>/.exec(readFileSync(join(root, file), 'utf8'))[1];
      const hash = createHash('sha256').update(inline).digest('base64');
      expect(csp, file + ': update the sha256 in vercel.json when the inline script changes').toContain(`'sha256-${hash}'`);
    }
  });
  it('forbid framing, plugins and inline scripts in general', () => {
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });
});
