import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { reportError } from './monitoring.ts';

// One client for the app. Server state (orders, order book, notifications…)
// lives here instead of in component state, with sane defaults: short
// staleness so data feels live. No query retries here: supabase-js already
// retries reads on network errors and 503/520 with backoff, and stacking
// our retries on top made a failed load take 20+ seconds to show an error.
export const queryClient = new QueryClient({
  // Failed loads and actions are reported (network blips are filtered out).
  queryCache: new QueryCache({ onError: (err, query) => reportError(err, 'query ' + String(query.queryKey[0])) }),
  mutationCache: new MutationCache({ onError: (err) => reportError(err, 'mutation') }),
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: false,
      refetchOnWindowFocus: true
    }
  }
});
