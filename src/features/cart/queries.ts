import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Cart } from '@/contracts/commerce'
import type { Network } from '@/contracts/nft'
import { useCartOwner } from '@/features/auth/session'
import { queryKeys, type CartOwner } from '@/shared/api/query-keys'
import { cartApi } from './api'

export const cartQueryOptions = (owner: CartOwner) =>
  queryOptions({
    queryKey: queryKeys.cart(owner),
    queryFn: ({ signal }) => cartApi.get(signal),
    staleTime: 10_000,
  })

export const quoteQueryOptions = (owner: CartOwner, network: Network) =>
  queryOptions({
    queryKey: queryKeys.quote(owner, network),
    queryFn: ({ signal }) => cartApi.quote(network, signal),
    staleTime: 0,
  })

export function useCart() {
  return useQuery(cartQueryOptions(useCartOwner()))
}

export function useCartCount() {
  const { data } = useCart()
  return data?.lines.reduce((sum, line) => sum + line.quantity, 0) ?? 0
}

export function useQuote(network: Network, enabled = true) {
  const owner = useCartOwner()
  return useQuery({ ...quoteQueryOptions(owner, network), enabled })
}

/**
 * Cart mutations answer with the full cart: it replaces the cached cart and
 * the quote is refetched, so totals always come from the API.
 */
function useCartMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<Cart>) {
  const queryClient = useQueryClient()
  const owner = useCartOwner()
  return useMutation({
    mutationFn,
    onSuccess: (cart) => {
      queryClient.setQueryData(queryKeys.cart(owner), cart)
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.cart(owner), 'quote'] })
    },
  })
}

export const useAddToCart = () => useCartMutation(cartApi.add)
export const useUpdateCartLine = () =>
  useCartMutation(({ lineId, quantity }: { lineId: string; quantity: number }) => cartApi.update(lineId, quantity))
export const useRemoveCartLine = () => useCartMutation((lineId: string) => cartApi.remove(lineId))
export const useAcknowledgePrices = () => useCartMutation(() => cartApi.acknowledgePrices())
export const useApplyCoupon = () => useCartMutation((code: string) => cartApi.applyCoupon(code))
export const useRemoveCoupon = () => useCartMutation(() => cartApi.removeCoupon())
