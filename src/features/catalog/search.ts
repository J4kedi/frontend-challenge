import { z } from 'zod'
import { ethAmount } from '@/contracts/common'
import { collection, network, sort, tab, type NftListQuery } from '@/contracts/nft'

// A hand-typed URL arrives parsed as JSON by the router: `?priceMin=1` is a number
// and `?networks=solana` a single string. Both are read as the app writes them.
const urlEth = z.preprocess((value) => (typeof value === 'number' ? String(value) : value), ethAmount)
const urlList = <T extends z.ZodType>(item: T) => z.preprocess((value) => (typeof value === 'string' ? [value] : value), z.array(item))

/**
 * Catalog state that lives in the URL: search, filters, sort and page survive
 * refresh, back/forward and sharing. Invalid values fall back to the default
 * instead of breaking the page.
 */
export const catalogSearch = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  collections: urlList(collection).optional().catch(undefined),
  networks: urlList(network).optional().catch(undefined),
  priceMin: urlEth.optional().catch(undefined),
  priceMax: urlEth.optional().catch(undefined),
  sort: sort.optional().catch(undefined),
  tab: tab.optional().catch(undefined),
  page: z.number().int().min(1).optional().catch(undefined),
})
export type CatalogSearch = z.infer<typeof catalogSearch>

export const PAGE_SIZE = 9

/** URL state → API query. Empty filters are dropped so equal states share one cache entry. */
export function toListQuery(search: CatalogSearch): NftListQuery {
  return {
    q: search.q || undefined,
    collections: search.collections?.length ? [...search.collections].sort() : undefined,
    networks: search.networks?.length ? [...search.networks].sort() : undefined,
    priceMin: search.priceMin,
    priceMax: search.priceMax,
    sort: search.sort,
    tab: search.tab,
    page: search.page ?? 1,
    pageSize: PAGE_SIZE,
  }
}
