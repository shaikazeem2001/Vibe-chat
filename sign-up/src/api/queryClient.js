import { QueryClient } from '@tanstack/react-query';

/**
 * Singleton QueryClient — shared across the entire app.
 *
 * Defaults:
 *  - staleTime 60 s  → profile/room data is cached for 60 s before refetch
 *  - retry 1         → one retry on network failure, then show error
 *  - refetchOnWindowFocus false → don't spam the API on tab switch
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
