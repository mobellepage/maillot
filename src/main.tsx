import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import './ui/ui.css';
import { queryClient } from './lib/queryClient.ts';
import { initialLang } from './lib/prefs.tsx';
import { loadMessages, type Lang } from './i18n/index.ts';
import { routes } from './app/router.tsx';
import { AppProviders } from './app/AppProviders.tsx';
import { installErrorReporting } from './lib/monitoring.ts';
import { installNative } from './lib/native.ts';
import { SITE_URL } from './config/site.ts';

installErrorReporting();

const router = createBrowserRouter(routes);
// Entrance animations resume with the first in-app navigation (see ui.css).
const firstLocation = router.state.location.key;
const stopFirstLoad = router.subscribe((state) => {
  if (state.location.key === firstLocation) return;
  document.documentElement.removeAttribute('data-first-load');
  stopFirstLoad();
});
const lang = initialLang();
const root = document.getElementById('root')!;

// Pages are prerendered to HTML at build time (in English); React takes over
// once the visitor's language is loaded. Rendering into the prerendered markup
// replaces it with identical content, so nothing shifts.
const start = (l: Lang) => loadMessages(l).then((dict) => ({ lang: l, dict }));
start(lang)
  .catch(() => start('en')) // offline before that language was cached
  .then((initialMessages) => {
    createRoot(root).render(
      <StrictMode>
        <AppProviders queryClient={queryClient} initialMessages={initialMessages}>
          <RouterProvider router={router} />
        </AppProviders>
      </StrictMode>
    );
    document.documentElement.removeAttribute('data-lang-pending');
    // iOS app only: deep links (maillot://…) and the native splash/status bar.
    void installNative((to) => void router.navigate(to), SITE_URL);
  });
