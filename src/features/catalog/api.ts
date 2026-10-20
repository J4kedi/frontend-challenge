import { z } from 'zod'
import { highlights, nftDetail, nftListResponse, nftSummary, type NftListQuery } from '@/contracts/nft'
import { request } from '@/shared/api/client'

export const catalogApi = {
  list: (query: NftListQuery, signal?: AbortSignal) =>
    request(nftListResponse, {
      url: '/nfts',
      signal,
      params: {
        q: query.q,
        collection: query.collections,
        network: query.networks,
        priceMin: query.priceMin,
        priceMax: query.priceMax,
        sort: query.sort,
        tab: query.tab,
        page: query.page,
        pageSize: query.pageSize,
      },
    }),
  detail: (id: string, signal?: AbortSignal) => request(nftDetail, { url: `/nfts/${encodeURIComponent(id)}`, signal }),
  related: (id: string, signal?: AbortSignal) =>
    request(z.object({ items: z.array(nftSummary) }), { url: `/nfts/${encodeURIComponent(id)}/related`, signal }),
  highlights: (signal?: AbortSignal) => request(highlights, { url: '/nfts/highlights', signal }),
}
