import { Suspense } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import Header from './Header.tsx';
import MobileNav from './MobileNav.tsx';
import Footer from './Footer.tsx';
import { PageFallback } from './PageFallback.tsx';
import { parseShareHash } from '../utils/share.ts';
import PublicVaultPage from '../features/vault/PublicVaultPage.tsx';
import { useCatalogSync } from '../features/catalog/useCatalog.ts';

export default function RootLayout() {
  useCatalogSync();
  const { hash } = useLocation();
  // Self-contained share links (#/vault/<data>) render a standalone page.
  const shared = parseShareHash(hash);
  if (shared !== undefined) return <PublicVaultPage data={shared} />;

  return (
    <div className="app-shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <div style={{ flex: 1 }}>
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </div>
      <Footer />
      <MobileNav />
      <ScrollRestoration />
    </div>
  );
}
