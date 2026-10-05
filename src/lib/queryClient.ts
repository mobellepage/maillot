import { QueryClient } from '@tanstack/react-query';

// One client for the app. Server state (orders, order book, notifications…)
// lives here instead of in component state, with sane defaults: short
// staleness so data feels live, no retry storms on auth errors.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: (count, error) => count < 2 && !String((error as Error)?.message || '').includes('JWT'),
      refetchOnWindowFocus: true
    }
  }
});
