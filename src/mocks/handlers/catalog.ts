import { http, HttpResponse } from 'msw'
import { COLLECTIONS, NETWORKS, SORTS, TABS, type Collection, type Network, type NftListResponse } from '@/contracts/nft'
import { compareEth } from '@/shared/lib/money'
import { db } from '../db/store'
import { SEED_NOW } from '../db/seed'
import type { NftRecord } from '../db/types'
import { api, fail, withNetwork } from '../http'
import { scenario } from '../scenarios'
import { defaultEdition, findNft, toNftDetail, toNftSummary } from '../views'

const NEW_WINDOW_MS = 14 * 24 * 3600_000
const ETH = /^\d+(\.\d{1,18})?$/

const oneOf = <T extends string>(values: readonly T[], value: string | null): value is T =>
  value !== null && (values as readonly string[]).includes(value)

const priceOf = (nft: NftRecord) => defaultEdition(nft).priceEth

export const catalogHandlers = [
  http.get(
    api('/nfts'),
    withNetwork(({ request }) => {
      const params = new URL(request.url).searchParams
      const q = params.get('q')?.trim().toLowerCase() ?? ''
      const collections = params.getAll('collection').filter((c): c is Collection => oneOf(COLLECTIONS, c))
      const networks = params.getAll('network').filter((n): n is Network => oneOf(NETWORKS, n))
      const priceMin = params.get('priceMin')
      const priceMax = params.get('priceMax')
      const sortParam = params.get('sort')
      const tabParam = params.get('tab')
      const sort = oneOf(SORTS, sortParam) ? sortParam : 'recent'
      const tab = oneOf(TABS, tabParam) ? tabParam : 'all'
      const page = Math.max(1, Number(params.get('page') ?? 1) || 1)
      const pageSize = Math.min(48, Math.max(1, Number(params.get('pageSize') ?? 9) || 9))
      if ((priceMin && !ETH.test(priceMin)) || (priceMax && !ETH.test(priceMax))) {
        return fail(422, 'VALIDATION_ERROR', 'Faixa de preço inválida', { fields: { price: 'Use valores em ETH' } })
      }

      const all = scenario() === 'empty' ? [] : db().nfts
      const base = all.filter((nft) => {
        if (q && !`${nft.name} ${nft.collectionName} ${nft.tokenId}`.toLowerCase().includes(q)) return false
        if (tab === 'new' && Date.parse(nft.listedAt) < SEED_NOW - NEW_WINDOW_MS) return false
        if (tab === 'trending' && nft.trendingScore < 70) return false
        if (priceMin && compareEth(priceOf(nft), priceMin) < 0) return false
        if (priceMax && compareEth(priceOf(nft), priceMax) > 0) return false
        return true
      })
      const inCollections = (nft: NftRecord) => !collections.length || collections.includes(nft.collection)
      const inNetworks = (nft: NftRecord) => !networks.length || networks.includes(nft.network)
      const matches = base.filter((nft) => inCollections(nft) && inNetworks(nft))

      const sorted = [...matches].sort((a, b) => {
        if (sort === 'price-asc') return compareEth(priceOf(a), priceOf(b)) || a.name.localeCompare(b.name)
        if (sort === 'price-desc') return compareEth(priceOf(b), priceOf(a)) || a.name.localeCompare(b.name)
        if (sort === 'name') return a.name.localeCompare(b.name, 'pt-BR')
        if (tab === 'trending') return b.trendingScore - a.trendingScore
        return Date.parse(b.listedAt) - Date.parse(a.listedAt)
      })

      const prices = all.map(priceOf).sort(compareEth)
      const body: NftListResponse = {
        items: sorted.slice((page - 1) * pageSize, page * pageSize).map(toNftSummary),
        page,
        pageSize,
        total: sorted.length,
        totalPages: Math.ceil(sorted.length / pageSize),
        facets: {
          // Each facet counts the results of every other active filter.
          collections: COLLECTIONS.map((id) => ({
            id,
            count: base.filter((nft) => nft.collection === id && inNetworks(nft)).length,
          })),
          networks: NETWORKS.map((id) => ({
            id,
            count: base.filter((nft) => nft.network === id && inCollections(nft)).length,
          })),
          price: { min: prices[0] ?? '0', max: prices.at(-1) ?? '0' },
        },
      }
      return HttpResponse.json(body)
    }),
  ),

  http.get(
    api('/nfts/highlights'),
    withNetwork(() => {
      const nfts = db().nfts
      const featured = findNft('sage-nomad-009') ?? nfts[0]!
      const related = [...nfts].sort((a, b) => b.trendingScore - a.trendingScore).slice(0, 4)
      return HttpResponse.json({ featured: toNftSummary(featured), related: related.map(toNftSummary) })
    }),
  ),

  http.get(
    api('/nfts/:id/related'),
    withNetwork(({ params }) => {
      const nft = findNft(String(params.id))
      if (!nft) return fail(404, 'NOT_FOUND', 'NFT não encontrado')
      const related = db()
        .nfts.filter((n) => n.id !== nft.id && n.collection === nft.collection)
        .slice(0, 5)
      return HttpResponse.json({ items: related.map(toNftSummary) })
    }),
  ),

  http.get(
    api('/nfts/:id'),
    withNetwork(({ params }) => {
      const nft = findNft(String(params.id))
      if (!nft) return fail(404, 'NOT_FOUND', 'Este NFT não existe ou foi removido do mercado')
      return HttpResponse.json(toNftDetail(nft))
    }),
  ),
]
