import { z } from 'zod'
import { ethAmount, isoDateTime, pageOf } from './common'

export const NETWORKS = ['ethereum', 'polygon', 'solana'] as const
export const network = z.enum(NETWORKS)
export type Network = z.infer<typeof network>
export const NETWORK_LABEL: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

export const COLLECTIONS = [
  'arte-digital',
  'fotografia',
  'musica',
  'arte-3d',
  'colecionaveis',
  'generativa',
  'jogos',
  'assinaturas',
  'utilidade',
] as const
export const collection = z.enum(COLLECTIONS)
export type Collection = z.infer<typeof collection>
export const COLLECTION_LABEL: Record<Collection, string> = {
  'arte-digital': 'Arte digital',
  fotografia: 'Fotografia',
  musica: 'Música',
  'arte-3d': 'Arte 3D',
  colecionaveis: 'Colecionáveis',
  generativa: 'Generativa',
  jogos: 'Jogos',
  assinaturas: 'Assinaturas',
  utilidade: 'Utilidade',
}

export const SORTS = ['recent', 'price-asc', 'price-desc', 'name'] as const
export const sort = z.enum(SORTS)
export type Sort = z.infer<typeof sort>
export const SORT_LABEL: Record<Sort, string> = {
  recent: 'Listados recentemente',
  'price-asc': 'Menor preço',
  'price-desc': 'Maior preço',
  name: 'Nome (A–Z)',
}

export const TABS = ['all', 'new', 'trending'] as const
export const tab = z.enum(TABS)
export type Tab = z.infer<typeof tab>
export const TAB_LABEL: Record<Tab, string> = {
  all: 'Todos os NFTs',
  new: 'Novos lançamentos',
  trending: 'Em alta',
}

/** The four artworks of the Figma file. Images are served from /images/nfts/<artwork>-<width>.<ext>. */
export const ARTWORKS = ['emerald', 'sage', 'golden', 'ivory'] as const
export const artwork = z.enum(ARTWORKS)
export type Artwork = z.infer<typeof artwork>

export const edition = z.object({
  id: z.string(),
  label: z.string(),
  supply: z.number().int().min(1).nullable(),
  available: z.number().int().min(0),
  maxPerOrder: z.number().int().min(1),
  priceEth: ethAmount,
})
export type Edition = z.infer<typeof edition>

export const nftSummary = z.object({
  id: z.string(),
  name: z.string(),
  tokenId: z.string(),
  collection,
  network,
  artwork,
  priceEth: ethAmount,
  previousPriceEth: ethAmount.nullable(),
  available: z.number().int().min(0),
  listedAt: isoDateTime,
  version: z.number().int().min(1),
})
export type NftSummary = z.infer<typeof nftSummary>

export const nftDetail = nftSummary.extend({
  description: z.string(),
  collectionName: z.string(),
  attributes: z.array(z.string()),
  rating: z.object({ average: z.number(), count: z.number().int() }),
  contractAddress: z.string(),
  gallery: z.array(artwork).min(1),
  editions: z.array(edition).min(1),
})
export type NftDetail = z.infer<typeof nftDetail>

export const nftListQuery = z.object({
  q: z.string().optional(),
  collections: z.array(collection).optional(),
  networks: z.array(network).optional(),
  priceMin: ethAmount.optional(),
  priceMax: ethAmount.optional(),
  sort: sort.optional(),
  tab: tab.optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(48).optional(),
})
export type NftListQuery = z.infer<typeof nftListQuery>

const facetCount = <T extends z.ZodType>(id: T) => z.object({ id, count: z.number().int().min(0) })

export const nftListResponse = pageOf(nftSummary).extend({
  facets: z.object({
    collections: z.array(facetCount(collection)),
    networks: z.array(facetCount(network)),
    price: z.object({ min: ethAmount, max: ethAmount }),
  }),
})
export type NftListResponse = z.infer<typeof nftListResponse>

export const highlights = z.object({
  featured: nftSummary,
  related: z.array(nftSummary),
})
export type Highlights = z.infer<typeof highlights>
