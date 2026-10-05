import { QueryClient } from '@tanstack/react-query';

// One client for the app. Server state (orders, order book, notifications…)
// lives here instead of in component state, with sane defaults: short
// staleness so data feels live. No query retries here: supabase-js already
// retries reads on network errors and 503/520 with backoff, and stacking
// our retries on top made a failed load take 20+ seconds to show an error.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: false,
      refetchOnWindowFocus: true
    }
  }
});
