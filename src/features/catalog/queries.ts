import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import type { NftListQuery } from '@/contracts/nft'
import { queryKeys } from '@/shared/api/query-keys'
import { catalogApi } from './api'

/**
 * One cache entry per exact query: a slow answer for an older search lands in
 * its own key and never replaces what is on screen. Query also aborts the
 * request of a key nobody observes anymore (the `signal` reaches Axios).
 */
export const nftListOptions = (query: NftListQuery) =>
  queryOptions({
    queryKey: queryKeys.nfts.list(query),
    queryFn: ({ signal }) => catalogApi.list(query, signal),
    placeholderData: keepPreviousData,
  })

export const nftDetailOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.nfts.detail(id),
    queryFn: ({ signal }) => catalogApi.detail(id, signal),
  })

export const relatedOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.nfts.related(id),
    queryFn: ({ signal }) => catalogApi.related(id, signal),
  })

export const highlightsOptions = () =>
  queryOptions({
    queryKey: queryKeys.nfts.highlights,
    queryFn: ({ signal }) => catalogApi.highlights(signal),
    staleTime: 5 * 60_000,
  })
