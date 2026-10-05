import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useSession } from '../lib/session.tsx';
import { PageFallback } from './PageFallback.tsx';

/** Sends signed-out visitors to sign-in and brings them back afterwards. */
export function RequireAuth({ children, admin }: { children: ReactNode; admin?: boolean }) {
  const { user, loading, isAdmin } = useSession();
  const location = useLocation();
  if (loading) return <PageFallback />;
  if (!user) return <Navigate to="/signin" replace state={{ from: location.pathname + location.search, notice: 'auth.signInFirst' }} />;
  if (admin && !isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
