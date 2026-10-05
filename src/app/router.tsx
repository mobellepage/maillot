// Route table. Every page is a lazy chunk, so the first visit only downloads
// the shell plus the page being opened.
import { createBrowserRouter, Navigate } from 'react-router';
import RootLayout from './RootLayout.tsx';
import { RequireAuth } from './RequireAuth.tsx';
import { AddShirtPage, AdminPage, AuthenticationPage, BrowsePage, DetailPage, HomePage, LegalPage, SellPage, SignInPage, VaultItemPage, VaultPage } from './pages.tsx';


export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'market', element: <BrowsePage /> },
      { path: 'shirt/:id', element: <DetailPage /> },
      { path: 'sell', element: <SellPage /> },
      { path: 'vault', element: <RequireAuth><VaultPage tab="collection" /></RequireAuth> },
      { path: 'watchlist', element: <VaultPage tab="watchlist" /> },
      { path: 'orders', element: <RequireAuth><VaultPage tab="orders" /></RequireAuth> },
      { path: 'vault/add', element: <RequireAuth><AddShirtPage /></RequireAuth> },
      { path: 'vault/item/:id', element: <RequireAuth><VaultItemPage /></RequireAuth> },
      { path: 'admin', element: <RequireAuth admin><AdminPage /></RequireAuth> },
      { path: 'signin', element: <SignInPage /> },
      { path: 'authentication', element: <AuthenticationPage /> },
      { path: 'help', element: <LegalPage doc="help" /> },
      { path: 'legal/:doc', element: <LegalPage /> },
      { path: '*', element: <Navigate to="/" replace /> }
    ]
  }
]);
