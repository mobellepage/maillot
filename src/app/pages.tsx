// Every page is its own lazily loaded chunk.
import { lazy } from 'react';

export const HomePage = lazy(() => import('../features/home/HomePage.tsx'));
export const BrowsePage = lazy(() => import('../features/browse/BrowsePage.tsx'));
export const DetailPage = lazy(() => import('../features/market/DetailPage.tsx'));
export const SellPage = lazy(() => import('../features/sell/SellPage.tsx'));
export const VaultPage = lazy(() => import('../features/vault/VaultPage.tsx'));
export const VaultItemPage = lazy(() => import('../features/vault/VaultItemPage.tsx'));
export const AddShirtPage = lazy(() => import('../features/vault/AddShirtPage.tsx'));
export const AdminPage = lazy(() => import('../features/admin/AdminPage.tsx'));
export const SignInPage = lazy(() => import('../features/auth/SignInPage.tsx'));
export const AuthenticationPage = lazy(() => import('../features/trust/AuthenticationPage.tsx'));
export const LegalPage = lazy(() => import('../features/trust/LegalPage.tsx'));

export const VerifyPage = lazy(() => import('../features/certificate/VerifyPage.tsx'));
export const IndexReportPage = lazy(() => import('../features/index/IndexReportPage.tsx'));
export const DevelopersPage = lazy(() => import('../features/index/DevelopersPage.tsx'));
export const OrderPage = lazy(() => import('../features/orders/OrderPage.tsx'));
