// Route table. Every page is a lazy chunk, so the first visit only downloads
// the shell plus the page being opened. The browser router is created in
// main.tsx; scripts/prerender.mjs renders the same routes to static HTML.
import { lazy } from "react";
import { Navigate, type RouteObject } from "react-router";
import RootLayout from "./RootLayout.tsx";
import RouteError from "./RouteError.tsx";
import { RequireAuth } from "./RequireAuth.tsx";
import {
  AddShirtPage,
  QuickAddPage,
  AdminPage,
  AuthenticationPage,
  BrowsePage,
  DetailPage,
  HomePage,
  LegalPage,
  SellPage,
  SignInPage,
  VaultItemPage,
  VaultPage,
  VerifyPage,
  IndexReportPage,
  DevelopersPage,
  OrderPage,
  WelcomePage,
  SellerPage,
  PremiumPage,
  PublicShirtPage,
  FeedPage,
  DailyPage,
  LibraryPage,
  ClubLibraryPage,
  EraPage,
  LegendPage,
  ReturnPage,
  AccountPage,
  ResetPasswordPage,
} from "./pages.tsx";

// Private partner preview (scripts/partner-demo.mjs): development only, never in a production build.
const PartnerDemoPage = import.meta.env.DEV
  ? lazy(() => import("../features/demo/PartnerDemoPage.tsx"))
  : null;

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      {
        // Errors inside a page keep the header and footer around them.
        errorElement: <RouteError />,
        children: [
          { index: true, element: <HomePage /> },
          { path: "feed", element: <FeedPage /> },
          { path: "daily", element: <DailyPage /> },
          { path: "library", element: <LibraryPage /> },
          { path: "library/:club", element: <ClubLibraryPage /> },
          { path: "era/:decade", element: <EraPage /> },
          { path: "legends/:slug", element: <LegendPage /> },
          { path: "market", element: <BrowsePage /> },
          { path: "shirt/:id", element: <DetailPage /> },
          { path: "sell", element: <SellPage /> },
          {
            path: "vault",
            element: (
              <RequireAuth>
                <VaultPage tab="collection" />
              </RequireAuth>
            ),
          },
          { path: "watchlist", element: <VaultPage tab="watchlist" /> },
          {
            path: "orders",
            element: (
              <RequireAuth>
                <VaultPage tab="orders" />
              </RequireAuth>
            ),
          },
          {
            path: "orders/:id",
            element: (
              <RequireAuth>
                <OrderPage />
              </RequireAuth>
            ),
          },
          {
            path: "vault/add",
            element: (
              <RequireAuth>
                <AddShirtPage />
              </RequireAuth>
            ),
          },
          {
            path: "vault/add/library",
            element: (
              <RequireAuth>
                <QuickAddPage />
              </RequireAuth>
            ),
          },
          {
            path: "vault/item/:id",
            element: (
              <RequireAuth>
                <VaultItemPage />
              </RequireAuth>
            ),
          },
          {
            path: "admin",
            element: (
              <RequireAuth admin>
                <AdminPage />
              </RequireAuth>
            ),
          },
          { path: "signin", element: <SignInPage /> },
          {
            path: "welcome",
            element: (
              <RequireAuth>
                <WelcomePage />
              </RequireAuth>
            ),
          },
          { path: "authentication", element: <AuthenticationPage /> },
          { path: "price-index", element: <IndexReportPage /> },
          { path: "developers", element: <DevelopersPage /> },
          { path: "premium", element: <PremiumPage /> },
          { path: "u/:handle", element: <SellerPage /> },
          { path: "u/:handle/:itemId", element: <PublicShirtPage /> },
          { path: "verify", element: <VerifyPage /> },
          { path: "verify/:code", element: <VerifyPage /> },
          { path: "help", element: <LegalPage doc="help" /> },
          { path: "return", element: <ReturnPage /> },
          { path: "account", element: <AccountPage /> },
          { path: "reset-password", element: <ResetPasswordPage /> },
          { path: "legal/:doc", element: <LegalPage /> },
          ...(PartnerDemoPage
            ? [{ path: "demo/partner", element: <PartnerDemoPage /> }]
            : []),
          { path: "*", element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
];
