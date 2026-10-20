import { queryOptions, useQuery } from '@tanstack/react-query'
import { useSession } from '@/features/auth/session'
import { queryKeys } from '@/shared/api/query-keys'
import { ordersApi } from './api'

/**
 * Order state comes from order.updated events; while an order is pending the
 * query also polls every 3 s, so a missed event (offline, reload) never leaves
 * the collector waiting. Terminal states stop polling.
 */
export const orderOptions = (userId: string, orderId: string) =>
  queryOptions({
    queryKey: queryKeys.user(userId).order(orderId),
    queryFn: ({ signal }) => ordersApi.get(orderId, signal),
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 3000 : false),
  })

export function useOrder(orderId: string) {
  const { user } = useSession()
  return useQuery({ ...orderOptions(user?.id ?? 'anonymous', orderId), enabled: Boolean(user) })
}

export function usePendingOrders() {
  const { user } = useSession()
  return useQuery({
    queryKey: queryKeys.user(user?.id ?? 'anonymous').pendingOrders,
    queryFn: ({ signal }) => ordersApi.pending(signal),
    enabled: Boolean(user),
  })
}
