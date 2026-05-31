import { QueryClient } from "@tanstack/react-query";

// Single shared client. Bio data is geographic + time filtered server-side, so
// cache it for a few minutes and avoid refetching on window focus.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
