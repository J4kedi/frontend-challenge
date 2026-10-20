import type { WalletProvider, WalletSlot } from '@/contracts/account'
import type { CheckoutBuyer, OrderLine, OrderStatus } from '@/contracts/commerce'
import type { RealtimeEvent } from '@/contracts/events'
import type { Artwork, Collection, Edition, Network } from '@/contracts/nft'

export interface UserRecord {
  id: string
  displayName: string
  username: string
  email: string
  ensName: string
  walletNickname: string
  avatarUrl: string | null
  passwordSalt: string
  passwordHash: string
  updatedAt: string
}

export interface SessionRecord {
  token: string
  userId: string
  expiresAt: string
}

export interface NftRecord {
  id: string
  name: string
  tokenId: string
  collection: Collection
  collectionName: string
  network: Network
  artwork: Artwork
  description: string
  attributes: string[]
  rating: { average: number; count: number }
  contractAddress: string
  gallery: Artwork[]
  editions: Edition[]
  defaultEditionId: string
  previousPriceEth: string | null
  listedAt: string
  trendingScore: number
  version: number
}

export interface CartLineRecord {
  id: string
  nftId: string
  editionId: string
  quantity: number
  acknowledgedPriceEth: string
}

export interface CartRecord {
  id: string
  lines: CartLineRecord[]
  couponCode: string | null
  version: number
}

export interface CouponRecord {
  code: string
  percentOff: number
  expiresAt: string
}

export interface WalletRecord {
  id: string
  userId: string
  slot: WalletSlot
  displayName: string
  nickname: string
  network: Network
  profileName: string
  address: string
  secondaryAddress: string | null
  provider: WalletProvider
  referralCode: string
  email: string
  ensName: string
  updatedAt: string
}

export interface ConnectionRecord {
  walletId: string
  provider: WalletProvider
  network: Network
  status: 'connected' | 'disconnected'
}

export interface OrderRecord {
  id: string
  userId: string
  status: OrderStatus
  version: number
  createdAt: string
  updatedAt: string
  lines: OrderLine[]
  subtotalEth: string
  discountEth: string
  networkFeeEth: string
  totalEth: string
  couponCode: string | null
  network: Network
  wallet: { id: string; provider: WalletProvider; address: string; nickname: string }
  buyer: CheckoutBuyer
  transaction: { hash: string; explorerUrl: string } | null
  failureReason: string | null
  /** When the simulated chain settles the payment, and with which outcome. */
  settleAt: string
  outcome: 'confirmed' | 'declined'
}

export interface IdempotencyRecord {
  userId: string
  bodyHash: string
  orderId: string
}

export interface MockDb {
  schema: 1
  seq: number
  users: UserRecord[]
  sessions: SessionRecord[]
  nfts: NftRecord[]
  favorites: Record<string, string[]>
  carts: Record<string, CartRecord>
  coupons: CouponRecord[]
  wallets: WalletRecord[]
  connections: Record<string, ConnectionRecord>
  orders: OrderRecord[]
  idempotency: Record<string, IdempotencyRecord>
  events: RealtimeEvent[]
}
