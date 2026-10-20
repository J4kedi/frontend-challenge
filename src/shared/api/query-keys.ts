import type { Network, NftListQuery } from '@/contracts/nft'

/**
 * Query key factory. Public catalog data lives under ['nfts']; everything that
 * belongs to a person lives under its owner — ['user', id] for the collector,
 * ['guest', cartId] for the visitor — so logging out or switching users drops
 * the previous owner's cache with one removeQueries call.
 */
export type CartOwner = readonly ['user', string] | readonly ['guest', string]

export const queryKeys = {
  session: (token: string | null) => ['session', token] as const,
  nfts: {
    all: ['nfts'] as const,
    lists: ['nfts', 'list'] as const,
    list: (query: NftListQuery) => ['nfts', 'list', query] as const,
    detail: (id: string) => ['nfts', 'detail', id] as const,
    related: (id: string) => ['nfts', 'related', id] as const,
    highlights: ['nfts', 'highlights'] as const,
  },
  cart: (owner: CartOwner) => [...owner, 'cart'] as const,
  quote: (owner: CartOwner, network: Network) => [...owner, 'cart', 'quote', network] as const,
  user: (userId: string) => ({
    all: ['user', userId] as const,
    favorites: ['user', userId, 'favorites'] as const,
    profile: ['user', userId, 'profile'] as const,
    wallets: ['user', userId, 'wallets'] as const,
    orders: ['user', userId, 'orders'] as const,
    order: (orderId: string) => ['user', userId, 'orders', orderId] as const,
    pendingOrders: ['user', userId, 'orders', 'pending'] as const,
  }),
}
