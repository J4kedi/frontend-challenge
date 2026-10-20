import type { Artwork, Collection, Edition, Network } from '@/contracts/nft'
import { NETWORK_LABEL } from '@/contracts/nft'
import { fromWei, toWei } from '@/shared/lib/money'
import type { MockDb, NftRecord, UserRecord, WalletRecord } from './types'

/** Fixed reference time: "new" and "listed" never depend on the real clock. */
export const SEED_NOW = Date.parse('2026-10-20T12:00:00.000Z')

/** Deterministic PRNG (mulberry32): same seed, same catalog, on every machine. */
export function prng(seed: number) {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Sidebar counts of the Figma home ("Coleções"). */
const COLLECTION_COUNTS: Record<Collection, number> = {
  'arte-digital': 33,
  fotografia: 12,
  musica: 65,
  'arte-3d': 39,
  colecionaveis: 23,
  generativa: 17,
  jogos: 19,
  assinaturas: 13,
  utilidade: 18,
}

/** Network weights follow the Figma "Rede" counts (119 / 78 / 86). */
const NETWORK_WEIGHTS: [Network, number][] = [
  ['ethereum', 119],
  ['polygon', 78],
  ['solana', 86],
]

const ART: Record<Artwork, { names: string[]; collectionName: string; attributes: string[] }> = {
  emerald: { names: ['Emerald Ape', 'Jade Sentinel', 'Verdant Ace'], collectionName: 'Kurio Apes', attributes: ['Óculos', 'Esmeralda', 'Raro'] },
  sage: { names: ['Sage Nomad', 'Violet Nomad', 'Cosmic Bloom', 'Lilac Drifter'], collectionName: 'Nomad Society', attributes: ['Chapéu', 'Lavanda', 'Incomum'] },
  golden: { names: ['Golden Beat', 'Golden Signal', 'Amber Pulse', 'Solar Tune'], collectionName: 'Golden Frequencies', attributes: ['Fones', 'Âmbar', 'Épico'] },
  ivory: { names: ['Ivory Baron', 'Neon Vessel', 'Onyx Regent'], collectionName: 'Ivory Court', attributes: ['Terno', 'Ônix', 'Lendário'] },
}
const ARTWORK_LIST = Object.keys(ART) as Artwork[]

/** The nine newest listings reproduce the Figma home grid, in order. */
const FIGMA_GRID: { name: string; number: number; artwork: Artwork; price: string; previous?: string }[] = [
  { name: 'Emerald Ape', number: 42, artwork: 'emerald', price: '1.19' },
  { name: 'Sage Nomad', number: 9, artwork: 'sage', price: '1.69' },
  { name: 'Neon Vessel', number: 552, artwork: 'ivory', price: '1.99', previous: '2.29' },
  { name: 'Cosmic Bloom', number: 118, artwork: 'sage', price: '1.29' },
  { name: 'Violet Nomad', number: 314, artwork: 'sage', price: '1.39' },
  { name: 'Ivory Baron', number: 88, artwork: 'ivory', price: '1.79' },
  { name: 'Golden Beat', number: 207, artwork: 'golden', price: '0.99' },
  { name: 'Golden Hour', number: 133, artwork: 'golden', price: '0.79' },
  { name: 'Golden Signal', number: 160, artwork: 'golden', price: '0.39' },
]

const round2 = (value: number) => (Math.round(value * 100) / 100).toFixed(2)
const scaleEth = (eth: string, factor: number) => {
  const wei = (toWei(eth) * BigInt(Math.round(factor * 100))) / 100n
  return round2(Number(fromWei(wei)))
}
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const hex = (random: () => number, length: number) =>
  Array.from({ length }, () => Math.floor(random() * 16).toString(16)).join('')

function editionsFor(id: string, price: string, random: () => number): Edition[] {
  return [
    { id: `${id}:1-1`, label: '1/1', supply: 1, available: random() < 0.5 ? 0 : 1, maxPerOrder: 1, priceEth: scaleEth(price, 5) },
    { id: `${id}:1-10`, label: '1/10', supply: 10, available: Math.floor(random() * 6), maxPerOrder: 2, priceEth: scaleEth(price, 1.5) },
    { id: `${id}:1-50`, label: '1/50', supply: 50, available: 12 + Math.floor(random() * 30), maxPerOrder: 10, priceEth: price },
    { id: `${id}:aberta`, label: 'Aberta', supply: null, available: 999, maxPerOrder: 25, priceEth: scaleEth(price, 0.6) },
  ]
}

function pickNetwork(random: () => number): Network {
  const total = NETWORK_WEIGHTS.reduce((sum, [, w]) => sum + w, 0)
  let roll = random() * total
  for (const [network, weight] of NETWORK_WEIGHTS) {
    roll -= weight
    if (roll < 0) return network
  }
  return 'ethereum'
}

function buildNfts(): NftRecord[] {
  const random = prng(20261020)
  const collections: Collection[] = []
  for (const [collection, count] of Object.entries(COLLECTION_COUNTS) as [Collection, number][]) {
    const remaining = collection === 'arte-digital' ? count - FIGMA_GRID.length : count
    for (let i = 0; i < remaining; i++) collections.push(collection)
  }
  // Fisher–Yates with the seeded PRNG
  for (let i = collections.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[collections[i], collections[j]] = [collections[j]!, collections[i]!]
  }

  const usedNames = new Set<string>()
  const nfts: NftRecord[] = []

  const add = (input: {
    name: string
    number: number
    artwork: Artwork
    price: string
    previous?: string
    collection: Collection
    network: Network
  }) => {
    const label = `${input.name} #${String(input.number).padStart(3, '0')}`
    usedNames.add(label)
    const id = slugify(label)
    const art = ART[input.artwork]
    const editions = editionsFor(id, input.price, random)
    const index = nfts.length
    nfts.push({
      id,
      name: label,
      tokenId: `#${String(input.number).padStart(4, '0')}`,
      collection: input.collection,
      collectionName: art.collectionName,
      network: input.network,
      artwork: input.artwork,
      description: `Um colecionável digital 1/50 finalizado à mão da coleção ${art.collectionName}, verificado na ${NETWORK_LABEL[input.network]}, com arte desbloqueável e acesso para colecionadores.`,
      attributes: art.attributes,
      rating: index === 0 ? { average: 5, count: 19 } : { average: 4 + Math.round(random() * 10) / 10, count: 3 + Math.floor(random() * 40) },
      contractAddress: `0x${hex(random, 40)}`,
      gallery: [input.artwork, input.artwork, input.artwork, input.artwork],
      editions,
      defaultEditionId: `${id}:1-50`,
      previousPriceEth: input.previous ?? null,
      listedAt: new Date(SEED_NOW - index * 3 * 3600_000).toISOString(),
      trendingScore: Math.floor(random() * 100),
      version: 1,
    })
  }

  for (const item of FIGMA_GRID) {
    add({ ...item, collection: 'arte-digital', network: 'ethereum' })
  }

  collections.forEach((collection, i) => {
    const artwork = ARTWORK_LIST[Math.floor(random() * ARTWORK_LIST.length)]!
    const names = ART[artwork].names
    let label: string
    let name: string
    let number: number
    do {
      name = names[Math.floor(random() * names.length)]!
      number = 1 + Math.floor(random() * 999)
      label = `${name} #${String(number).padStart(3, '0')}`
    } while (usedNames.has(label))
    // Price range of the Figma filter: 0.02 – 12.30 ETH, skewed to the low end.
    const price = i === 0 ? '12.30' : i === 1 ? '0.02' : round2(0.02 + 12.28 * random() ** 3)
    const previous = random() < 0.12 ? round2(Number(price) * 1.15) : undefined
    add({ name, number, artwork, price, previous, collection, network: pickNetwork(random) })
  })

  return nfts
}

const USERS: UserRecord[] = [
  {
    id: 'usr_ana',
    displayName: 'Ana Colecionadora',
    username: 'ana.coleciona',
    email: 'ana@kurio.test',
    ensName: 'anacoleciona',
    walletNickname: 'Cofre principal',
    avatarUrl: null,
    // password: kurio2026 (PBKDF2-SHA256, 100k iterations, salt "seed-ana")
    passwordSalt: 'seed-ana',
    passwordHash: '07072f8cdfdb0d6088bab588e08fdde991d4a058feb0d77dea440b80533fce10',
    updatedAt: new Date(SEED_NOW).toISOString(),
  },
  {
    id: 'usr_bruno',
    displayName: 'Bruno Arte',
    username: 'bruno.arte',
    email: 'bruno@kurio.test',
    ensName: 'brunoarte',
    walletNickname: 'Carteira do Bruno',
    avatarUrl: null,
    // password: kurio2026 (salt "seed-bruno")
    passwordSalt: 'seed-bruno',
    passwordHash: '014d1439d519e4cc8cd7eb215cdd0cbdf0d4f9db41726a3a55c5e4ca20ad56aa',
    updatedAt: new Date(SEED_NOW).toISOString(),
  },
]

const WALLETS: WalletRecord[] = [
  {
    id: 'wal_ana_primary',
    userId: 'usr_ana',
    slot: 'primary',
    displayName: 'Ana Colecionadora',
    nickname: 'Cofre principal',
    network: 'ethereum',
    profileName: 'Ana',
    address: '0x7A42c1F0b7D3E9a1C4b5D6E7F8091A2B3C4D19E8',
    secondaryAddress: null,
    provider: 'metamask',
    referralCode: 'KURIO-ANA',
    email: 'ana@kurio.test',
    ensName: 'anacoleciona',
    updatedAt: new Date(SEED_NOW).toISOString(),
  },
  {
    id: 'wal_bruno_primary',
    userId: 'usr_bruno',
    slot: 'primary',
    displayName: 'Bruno Arte',
    nickname: 'Carteira do Bruno',
    network: 'polygon',
    profileName: 'Bruno',
    address: '0x9B1d6aE4c0F2b3A4d5E6f708192a3B4c5D6e7F80',
    secondaryAddress: null,
    provider: 'coinbase',
    referralCode: 'KURIO-BRUNO',
    email: 'bruno@kurio.test',
    ensName: 'brunoarte',
    updatedAt: new Date(SEED_NOW).toISOString(),
  },
]

export function createSeed(): MockDb {
  return {
    schema: 1,
    seq: 1000,
    users: structuredClone(USERS),
    sessions: [],
    nfts: buildNfts(),
    favorites: { usr_ana: ['sage-nomad-009'], usr_bruno: [] },
    carts: {
      'user:usr_bruno': {
        id: 'user:usr_bruno',
        lines: [
          { id: 'line_bruno_1', nftId: 'golden-beat-207', editionId: 'golden-beat-207:1-50', quantity: 1, acknowledgedPriceEth: '0.99' },
        ],
        couponCode: null,
        version: 1,
      },
    },
    coupons: [
      { code: 'KURIO10', percentOff: 10, expiresAt: '2099-12-31T23:59:59.000Z' },
      { code: 'LANCAMENTO15', percentOff: 15, expiresAt: '2099-12-31T23:59:59.000Z' },
      { code: 'EXPIRADO5', percentOff: 5, expiresAt: '2026-01-01T00:00:00.000Z' },
    ],
    wallets: structuredClone(WALLETS),
    connections: {},
    orders: [],
    idempotency: {},
    events: [],
  }
}
