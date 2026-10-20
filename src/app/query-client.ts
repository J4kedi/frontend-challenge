import { QueryClient } from '@tanstack/react-query'
import { isApiError } from '@/shared/api/errors'

/**
 * Cache policy (ARCHITECTURE.md, "Cache e sincronização"):
 * - data is fresh for 30 s; realtime events patch it in between;
 * - only transient failures retry (network, timeout, 5xx), twice, with backoff;
 * - mutations never retry on their own: the order flow retries explicitly with
 *   the same idempotency key, everything else asks the user.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => isApiError(error) && error.retryable && failureCount < 2,
        retryDelay: (attempt) => Math.min(500 * 2 ** (attempt + 1), 4000),
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: false,
      },
    },
  })
}
