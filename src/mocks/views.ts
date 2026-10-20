import type { User, Wallet } from '@/contracts/account'
import type { Cart, Order, Quote, QuoteLine } from '@/contracts/commerce'
import type { Network, NftDetail, NftSummary } from '@/contracts/nft'
import { addEth, compareEth, multiplyEth, percentOfEth, subtractEth } from '@/shared/lib/money'
import { db, stableHash } from './db/store'
import type { CartRecord, NftRecord, OrderRecord, UserRecord, WalletRecord } from './db/types'

/** Record → contract projections: the only shapes that leave the mock backend. */

export const defaultEdition = (nft: NftRecord) =>
  nft.editions.find((e) => e.id === nft.defaultEditionId) ?? nft.editions[0]!

export function toNftSummary(nft: NftRecord): NftSummary {
  const edition = defaultEdition(nft)
  return {
    id: nft.id,
    name: nft.name,
    tokenId: nft.tokenId,
    collection: nft.collection,
    network: nft.network,
    artwork: nft.artwork,
    priceEth: edition.priceEth,
    previousPriceEth: nft.previousPriceEth,
    available: edition.available,
    listedAt: nft.listedAt,
    version: nft.version,
  }
}

export function toNftDetail(nft: NftRecord): NftDetail {
  return {
    ...toNftSummary(nft),
    description: nft.description,
    collectionName: nft.collectionName,
    attributes: nft.attributes,
    rating: nft.rating,
    contractAddress: nft.contractAddress,
    gallery: nft.gallery,
    editions: nft.editions,
  }
}

export function toUser(user: UserRecord): User {
  return {
    id: user.id,
    displayName: user.displayName,
    username: user.username,
    email: user.email,
    ensName: user.ensName,
    walletNickname: user.walletNickname,
    avatarUrl: user.avatarUrl,
    updatedAt: user.updatedAt,
  }
}

export function toWallet(wallet: WalletRecord): Wallet {
  const { userId: _userId, ...rest } = wallet
  const connection = db().connections[wallet.id]
  return {
    ...rest,
    connection: connection ? { provider: connection.provider, network: connection.network, status: connection.status } : null,
  }
}

export function findNft(id: string) {
  return db().nfts.find((n) => n.id === id)
}

export function toCart(cart: CartRecord): Cart {
  return {
    id: cart.id,
    couponCode: cart.couponCode,
    version: cart.version,
    lines: cart.lines.flatMap((line) => {
      const nft = findNft(line.nftId)
      const edition = nft?.editions.find((e) => e.id === line.editionId)
      if (!nft || !edition) return []
      return [
        {
          id: line.id,
          nftId: nft.id,
          editionId: edition.id,
          editionLabel: edition.label,
          name: nft.name,
          tokenId: nft.tokenId,
          artwork: nft.artwork,
          network: nft.network,
          quantity: line.quantity,
          unitPriceEth: edition.priceEth,
          acknowledgedPriceEth: line.acknowledgedPriceEth,
          available: edition.available,
          maxPerOrder: edition.maxPerOrder,
        },
      ]
    }),
  }
}

/** Network fee of the simulated chains: base + per line (Ethereum, 3 lines = 0.016 ETH as in the Figma). */
const FEES: Record<Network, { base: string; perLine: string }> = {
  ethereum: { base: '0.004', perLine: '0.004' },
  polygon: { base: '0.0005', perLine: '0.0005' },
  solana: { base: '0.0001', perLine: '0.0001' },
}

export function networkFee(network: Network, lines: number) {
  if (lines === 0) return '0'
  return addEth(FEES[network].base, multiplyEth(FEES[network].perLine, lines))
}

export function computeQuote(cart: CartRecord, network: Network): Quote {
  const lines: QuoteLine[] = cart.lines.flatMap((line) => {
    const nft = findNft(line.nftId)
    const edition = nft?.editions.find((e) => e.id === line.editionId)
    if (!nft || !edition) return []
    const priceChanged = compareEth(edition.priceEth, line.acknowledgedPriceEth) !== 0
    const status: QuoteLine['status'] =
      edition.available === 0
        ? 'unavailable'
        : line.quantity > edition.available
          ? 'insufficient'
          : priceChanged
            ? 'price-changed'
            : 'ok'
    return [
      {
        lineId: line.id,
        nftId: nft.id,
        editionId: edition.id,
        editionLabel: edition.label,
        name: nft.name,
        tokenId: nft.tokenId,
        artwork: nft.artwork,
        quantity: line.quantity,
        unitPriceEth: edition.priceEth,
        previousUnitPriceEth: priceChanged ? line.acknowledgedPriceEth : null,
        lineTotalEth: multiplyEth(edition.priceEth, line.quantity),
        available: edition.available,
        status,
      },
    ]
  })

  const subtotal = lines.length ? addEth(...lines.map((l) => l.lineTotalEth)) : '0'
  let coupon: Quote['coupon'] = null
  let discount = '0'
  if (cart.couponCode) {
    const record = db().coupons.find((c) => c.code === cart.couponCode)
    if (!record) {
      coupon = { code: cart.couponCode, status: 'invalid', percentOff: null, message: 'Cupom inválido' }
    } else if (Date.parse(record.expiresAt) <= Date.now()) {
      coupon = { code: record.code, status: 'expired', percentOff: record.percentOff, message: 'Cupom expirado' }
    } else {
      discount = percentOfEth(subtotal, record.percentOff)
      coupon = { code: record.code, status: 'applied', percentOff: record.percentOff, message: `${record.percentOff}% de desconto aplicado` }
    }
  }
  const fee = networkFee(network, lines.length)
  const total = addEth(subtractEth(subtotal, discount), fee)
  const body = {
    cartVersion: cart.version,
    network,
    lines,
    subtotalEth: subtotal,
    discountEth: discount,
    networkFeeEth: fee,
    totalEth: total,
    coupon,
    purchasable: lines.length > 0 && lines.every((l) => l.status === 'ok'),
  }
  return { id: `q_${stableHash(body)}`, ...body, createdAt: new Date().toISOString() }
}

export function toOrder(order: OrderRecord): Order {
  const { userId: _userId, settleAt: _settleAt, outcome: _outcome, ...rest } = order
  return rest
}
