import type { QueryClient } from '@tanstack/react-query'
import type { Cart, Order } from '@/contracts/commerce'
import type { NftUpdatedEvent, OrderUpdatedEvent, RealtimeEvent } from '@/contracts/events'
import type { NftDetail, NftListResponse, NftSummary } from '@/contracts/nft'
import { announce } from '@/shared/a11y/announcer'
import { queryKeys } from '@/shared/api/query-keys'
import { compareEth, formatEth } from '@/shared/lib/money'

/**
 * Applies an accepted realtime event to the query cache. Summaries and details
 * are patched in place (only if the event is newer than the cached version);
 * cart totals are never computed here — the cart and its quote are refetched,
 * because the REST quote is the source of truth for what the collector pays.
 */
/**
 * The collector's own order reserves stock, and the server publishes that like
 * any other change, sometimes before the order response. Selling out the last
 * unit to oneself is not news: while a purchase is being sent (and a few
 * seconds after) the sold-out of a cart line is not announced.
 */
let ownPurchaseUntil = 0
export function markOwnPurchase(sending: boolean) {
  ownPurchaseUntil = sending ? Number.POSITIVE_INFINITY : Date.now() + 5_000
}

export function applyEvent(queryClient: QueryClient, event: RealtimeEvent, currentUserId: string | null) {
  if (event.type === 'nft.updated') applyNftUpdated(queryClient, event)
  else if (currentUserId && event.userId === currentUserId) applyOrderUpdated(queryClient, event, currentUserId)
}

function patchSummary<T extends NftSummary>(item: T, event: NftUpdatedEvent): T {
  if (item.id !== event.resource.id || item.version >= event.version) return item
  return {
    ...item,
    priceEth: event.data.priceEth,
    previousPriceEth: event.data.previousPriceEth,
    available: event.data.available,
    version: event.version,
  }
}

function applyNftUpdated(queryClient: QueryClient, event: NftUpdatedEvent) {
  const nftId = event.resource.id

  queryClient.setQueriesData<NftListResponse>({ queryKey: queryKeys.nfts.lists }, (page) =>
    page ? { ...page, items: page.items.map((item) => patchSummary(item, event)) } : page,
  )
  queryClient.setQueriesData<{ items: NftSummary[] }>({ queryKey: ['nfts', 'related'] }, (data) =>
    data ? { ...data, items: data.items.map((item) => patchSummary(item, event)) } : data,
  )
  queryClient.setQueryData<{ featured: NftSummary; related: NftSummary[] }>(queryKeys.nfts.highlights, (data) =>
    data
      ? { featured: patchSummary(data.featured, event), related: data.related.map((item) => patchSummary(item, event)) }
      : data,
  )
  queryClient.setQueryData<NftDetail>(queryKeys.nfts.detail(nftId), (nft) => {
    if (!nft || nft.version >= event.version) return nft
    return {
      ...patchSummary(nft, event),
      editions: nft.editions.map((edition) => {
        const update = event.data.editions.find((e) => e.id === edition.id)
        return update ? { ...edition, priceEth: update.priceEth, available: update.available } : edition
      }),
    }
  })

  // Carts holding this NFT: tell the collector what changed, then refetch cart + quote.
  for (const [key, cart] of queryClient.getQueriesData<Cart>({ predicate: (q) => q.queryKey.at(-1) === 'cart' })) {
    const line = cart?.lines.find((l) => l.nftId === nftId)
    if (!line) continue
    const edition = event.data.editions.find((e) => e.id === line.editionId)
    if (edition && edition.available === 0) {
      if (Date.now() >= ownPurchaseUntil) announce(`${line.name}: a edição ${line.editionLabel} esgotou. O resumo do carrinho foi atualizado.`)
    } else if (edition && compareEth(edition.priceEth, line.unitPriceEth) !== 0) {
      announce(
        `${line.name}: o preço mudou de ${formatEth(line.unitPriceEth)} para ${formatEth(edition.priceEth)}. O resumo do carrinho foi atualizado.`,
      )
    }
    void queryClient.invalidateQueries({ queryKey: key })
  }
}

function applyOrderUpdated(queryClient: QueryClient, event: OrderUpdatedEvent, userId: string) {
  const keys = queryKeys.user(userId)
  queryClient.setQueryData<Order>(keys.order(event.resource.id), (order) =>
    order && order.version < event.version
      ? {
          ...order,
          status: event.data.status,
          failureReason: event.data.failureReason,
          transaction: event.data.transaction,
          version: event.version,
        }
      : order,
  )
  void queryClient.invalidateQueries({ queryKey: keys.pendingOrders })
  if (event.data.status === 'pending') return
  void queryClient.invalidateQueries({ queryKey: queryKeys.cart(['user', userId]) })
  announce(
    event.data.status === 'confirmed'
      ? 'Pagamento confirmado. Seus NFTs estão na sua carteira.'
      : 'Pagamento recusado. Nenhum valor foi cobrado e seus itens continuam no carrinho.',
  )
}
