import { Suspense } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import Header from './Header.tsx';
import MobileNav from './MobileNav.tsx';
import Footer from './Footer.tsx';
import { PageFallback } from './PageFallback.tsx';
import { parseShareHash } from '../utils/share.ts';
import { PublicVaultPage } from './pages.tsx';
import { useCatalogSync } from '../features/catalog/useCatalog.ts';
import { useOnboardingRedirect } from './useOnboardingRedirect.ts';
import { OfflineBar } from './OfflineBar.tsx';
import { RouteAnnouncer } from './RouteAnnouncer.tsx';
import { AuthLinkNotice } from './AuthLinkNotice.tsx';

export default function RootLayout() {
  useCatalogSync();
  useOnboardingRedirect();
  const { hash } = useLocation();
  // Self-contained share links (#/vault/<data>) render a standalone page.
  const shared = parseShareHash(hash);
  if (shared !== undefined)
    return (
      <Suspense fallback={<PageFallback />}>
        <PublicVaultPage data={shared} />
      </Suspense>
    );

  return (
    <div className="app-shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <RouteAnnouncer />
      <AuthLinkNotice />
      <OfflineBar />
      <Header />
      <div style={{ flex: 1 }}>
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </div>
      <Footer />
      <MobileNav />
      {/* Every full page load has location.key "default", so keying on it
          would restore one page's scroll position on another. Key initial
          loads by path; in-app navigations by entry (back restores, new
          navigations start at the top). */}
      <ScrollRestoration getKey={(loc) => (loc.key === 'default' ? loc.pathname : loc.key)} />
    </div>
  );
}
