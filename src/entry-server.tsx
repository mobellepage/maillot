// Build-time prerender (scripts/prerender.mjs): renders public routes to
// static HTML so the first paint doesn't wait for JavaScript, and so link
// previews and search engines see real content. Signed-in pages aren't
// prerendered — they depend on the visitor.
import { prerender } from 'react-dom/static';
import { QueryClient } from '@tanstack/react-query';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import { routes } from './app/router.tsx';
import { AppProviders } from './app/AppProviders.tsx';
import { EN } from './i18n/index.ts';
import { ssrHead } from './lib/meta.ts';
import { SHIRTS } from './data.ts';

export const PATHS = [
  '/',
  '/market',
  '/sell',
  '/authentication',
  '/price-index',
  '/developers',
  '/verify',
  '/help',
  '/legal/terms',
  '/legal/privacy',
  '/legal/imprint',
  ...SHIRTS.map((s) => '/shirt/' + s.id)
];

async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return out + decoder.decode();
    out += decoder.decode(value, { stream: true });
  }
}

export async function render(path: string): Promise<{ html: string; title: string; description: string }> {
  const handler = createStaticHandler(routes);
  const context = await handler.query(new Request('https://maillot.app' + path));
  if (context instanceof Response) throw new Error('unexpected redirect for ' + path);
  const router = createStaticRouter(handler.dataRoutes, context);
  ssrHead.title = '';
  ssrHead.description = '';
  const { prelude } = await prerender(
    <AppProviders queryClient={new QueryClient({ defaultOptions: { queries: { enabled: false } } })} initialMessages={{ lang: 'en', dict: EN }}>
      <StaticRouterProvider router={router} context={context} hydrate={false} />
    </AppProviders>
  );
  return { html: await streamToString(prelude), title: ssrHead.title, description: ssrHead.description };
}
