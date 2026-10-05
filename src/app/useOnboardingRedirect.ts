// New members land on /welcome once, wherever they signed in. Reading the
// legal pages, help and certificates never redirects; skipping marks the
// profile as onboarded, so it never asks again.
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useSession } from '../lib/session.tsx';

const EXEMPT = /^\/(welcome|signin|legal|help|verify|authentication)(\/|$)/;

export function useOnboardingRedirect() {
  const { profile } = useSession();
  const { pathname, search } = useLocation();
  const nav = useNavigate();
  const pending = !!profile && !profile.onboardedAt;
  useEffect(() => {
    if (pending && !EXEMPT.test(pathname)) nav('/welcome', { replace: true, state: { from: pathname + search } });
  }, [pending, pathname, search, nav]);
}
