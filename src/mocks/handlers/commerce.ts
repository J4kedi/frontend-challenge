import { delay, http, HttpResponse } from 'msw'
import { network as networkSchema, type Edition } from '@/contracts/nft'
import { addCartItemBody, couponBody, createOrderBody, mergeCartBody, updateCartItemBody } from '@/contracts/commerce'
import { db, nextId, persist, stableHash } from '../db/store'
import type { CartRecord, NftRecord, OrderRecord, UserRecord } from '../db/types'
import { api, authenticate, fail, now, readBody, withNetwork } from '../http'
import { nftUpdated, orderUpdated, publish } from '../realtime/server'
import { scenario } from '../scenarios'
import { computeQuote, findNft, toCart, toOrder } from '../views'

/** Simulated chain: payments settle 1.5 s after the order is created. */
const SETTLE_MS = 1500
/** order-timeout scenario: the first POST answers after the client's 8 s timeout. */
const ORDER_TIMEOUT_DELAY_MS = 10_000
const GUEST_ID = /^[A-Za-z0-9-]{8,64}$/

function ensureCart(id: string): CartRecord {
  const carts = db().carts
  carts[id] ??= { id, lines: [], couponCode: null, version: 0 }
  return carts[id]
}

/** Authenticated requests use the collector's cart; visitors use the cart named by X-Cart-Id. */
function resolveCart(request: Request): { cart: CartRecord; user: UserRecord | null } | { error: Response } {
  if (request.headers.has('Authorization')) {
    const auth = authenticate(request)
    if ('error' in auth) return auth
    return { cart: ensureCart(`user:${auth.user.id}`), user: auth.user }
  }
  const guestId = request.headers.get('X-Cart-Id')
  if (!guestId || !GUEST_ID.test(guestId)) return { error: fail(400, 'VALIDATION_ERROR', 'Carrinho não identificado') }
  return { cart: ensureCart(`guest:${guestId}`), user: null }
}

function checkQuantity(nft: NftRecord, edition: Edition, quantity: number) {
  if (edition.available === 0) {
    return fail(409, 'OUT_OF_STOCK', `A edição ${edition.label} de ${nft.name} esgotou`, {
      fields: { editionId: 'Edição esgotada' },
    })
  }
  if (quantity > edition.maxPerOrder) {
    return fail(422, 'QUANTITY_LIMIT', `Máximo de ${edition.maxPerOrder} por pedido nesta edição`, {
      fields: { quantity: `Máximo de ${edition.maxPerOrder} por pedido` },
      details: { max: edition.maxPerOrder },
    })
  }
  if (quantity > edition.available) {
    return fail(409, 'OUT_OF_STOCK', `Só ${edition.available} disponível(is) nesta edição`, {
      fields: { quantity: `Disponível: ${edition.available}` },
      details: { available: edition.available },
    })
  }
  return null
}

function findEdition(nftId: string, editionId: string) {
  const nft = findNft(nftId)
  const edition = nft?.editions.find((e) => e.id === editionId)
  return nft && edition ? { nft, edition } : null
}

function touch(cart: CartRecord) {
  cart.version += 1
  persist()
  return HttpResponse.json(toCart(cart))
}

const EXPLORERS = {
  ethereum: 'https://etherscan.io/tx/',
  polygon: 'https://polygonscan.com/tx/',
  solana: 'https://solscan.io/tx/',
} as const

const timers = new Map<string, ReturnType<typeof setTimeout>>()

function settle(orderId: string) {
  timers.delete(orderId)
  const order = db().orders.find((o) => o.id === orderId)
  if (!order || order.status !== 'pending') return
  order.status = order.outcome
  order.version += 1
  order.updatedAt = now()
  if (order.outcome === 'confirmed') {
    const hash = `0x${Array.from({ length: 8 }, (_, i) => stableHash(`${order.id}:${i}`)).join('')}`
    order.transaction = { hash, explorerUrl: `${EXPLORERS[order.network]}${hash}` }
    const cart = db().carts[`user:${order.userId}`]
    if (cart) {
      for (const bought of order.lines) {
        const line = cart.lines.find((l) => l.editionId === bought.editionId)
        if (line) line.quantity -= bought.quantity
      }
      cart.lines = cart.lines.filter((l) => l.quantity > 0)
      cart.version += 1
    }
  } else {
    order.failureReason = 'Pagamento recusado pela rede simulada. Nenhum valor foi cobrado e seus itens continuam no carrinho.'
    for (const line of order.lines) {
      const found = findEdition(line.nftId, line.editionId)
      if (!found) continue
      found.edition.available += line.quantity
      found.nft.version += 1
      publish(nftUpdated(found.nft))
    }
  }
  persist()
  publish(orderUpdated(order))
}

function scheduleSettlement(order: OrderRecord) {
  if (order.status !== 'pending' || timers.has(order.id)) return
  const wait = Math.max(0, Date.parse(order.settleAt) - Date.now())
  timers.set(
    order.id,
    setTimeout(() => settle(order.id), wait),
  )
}

/** Called at mock start-up: payments still pending after a reload settle on schedule. */
export function resumeSettlements() {
  for (const order of db().orders) scheduleSettlement(order)
}

/** Lazy settlement for reads: a pending order past its settle time is finalized before answering. */
function settleIfDue(order: OrderRecord) {
  if (order.status === 'pending' && Date.parse(order.settleAt) <= Date.now()) settle(order.id)
}

export const commerceHandlers = [
  http.get(
    api('/cart'),
    withNetwork(({ request }) => {
      const resolved = resolveCart(request)
      if ('error' in resolved) return resolved.error
      return HttpResponse.json(toCart(resolved.cart))
    }),
  ),

  http.post(
    api('/cart/items'),
    withNetwork(async ({ request }) => {
      const resolved = resolveCart(request)
      if ('error' in resolved) return resolved.error
      const body = await readBody(request, addCartItemBody)
      if (body.error) return body.error
      const found = findEdition(body.data.nftId, body.data.editionId)
      if (!found) return fail(404, 'NOT_FOUND', 'NFT ou edição não encontrados')
      const { cart } = resolved
      const existing = cart.lines.find((l) => l.editionId === body.data.editionId)
      const quantity = (existing?.quantity ?? 0) + body.data.quantity
      const invalid = checkQuantity(found.nft, found.edition, quantity)
      if (invalid) return invalid
      if (existing) {
        existing.quantity = quantity
        existing.acknowledgedPriceEth = found.edition.priceEth
      } else {
        cart.lines.push({
          id: nextId('line'),
          nftId: found.nft.id,
          editionId: found.edition.id,
          quantity,
          acknowledgedPriceEth: found.edition.priceEth,
        })
      }
      return touch(cart)
    }),
  ),

  http.patch(
    api('/cart/items/:lineId'),
    withNetwork(async ({ request, params }) => {
      const resolved = resolveCart(request)
      if ('error' in resolved) return resolved.error
      const body = await readBody(request, updateCartItemBody)
      if (body.error) return body.error
      const line = resolved.cart.lines.find((l) => l.id === String(params.lineId))
      if (!line) return fail(404, 'NOT_FOUND', 'Item não está mais no carrinho')
      const found = findEdition(line.nftId, line.editionId)
      if (!found) return fail(404, 'NOT_FOUND', 'NFT ou edição não encontrados')
      const invalid = checkQuantity(found.nft, found.edition, body.data.quantity)
      if (invalid) return invalid
      line.quantity = body.data.quantity
      return touch(resolved.cart)
    }),
  ),

  http.delete(
    api('/cart/items/:lineId'),
    withNetwork(({ request, params }) => {
      const resolved = resolveCart(request)
      if ('error' in resolved) return resolved.error
      resolved.cart.lines = resolved.cart.lines.filter((l) => l.id !== String(params.lineId))
      return touch(resolved.cart)
    }),
  ),

  http.post(
    api('/cart/acknowledge'),
    withNetwork(({ request }) => {
      const resolved = resolveCart(request)
      if ('error' in resolved) return resolved.error
      for (const line of resolved.cart.lines) {
        const found = findEdition(line.nftId, line.editionId)
        if (found) line.acknowledgedPriceEth = found.edition.priceEth
      }
      return touch(resolved.cart)
    }),
  ),

  http.put(
    api('/cart/coupon'),
    withNetwork(async ({ request }) => {
      const resolved = resolveCart(request)
      if ('error' in resolved) return resolved.error
      const body = await readBody(request, couponBody)
      if (body.error) return body.error
      const code = body.data.code.toUpperCase()
      const coupon = db().coupons.find((c) => c.code === code)
      if (!coupon) {
        return fail(422, 'COUPON_INVALID', 'Cupom inválido', { fields: { code: 'Código promocional inválido' } })
      }
      if (Date.parse(coupon.expiresAt) <= Date.now()) {
        return fail(422, 'COUPON_EXPIRED', 'Cupom expirado', { fields: { code: 'Este código promocional expirou' } })
      }
      resolved.cart.couponCode = code
      return touch(resolved.cart)
    }),
  ),

  http.delete(
    api('/cart/coupon'),
    withNetwork(({ request }) => {
      const resolved = resolveCart(request)
      if ('error' in resolved) return resolved.error
      resolved.cart.couponCode = null
      return touch(resolved.cart)
    }),
  ),

  http.post(
    api('/cart/merge'),
    withNetwork(async ({ request }) => {
      const auth = authenticate(request)
      if ('error' in auth) return auth.error
      const body = await readBody(request, mergeCartBody)
      if (body.error) return body.error
      const target = ensureCart(`user:${auth.user.id}`)
      const guest = db().carts[`guest:${body.data.guestCartId}`]
      if (guest?.lines.length) {
        for (const line of guest.lines) {
          const found = findEdition(line.nftId, line.editionId)
          if (!found) continue
          const cap = Math.min(found.edition.maxPerOrder, found.edition.available)
          if (cap <= 0) continue
          const existing = target.lines.find((l) => l.editionId === line.editionId)
          if (existing) existing.quantity = Math.min(cap, existing.quantity + line.quantity)
          else target.lines.push({ ...line, id: nextId('line'), quantity: Math.min(cap, line.quantity) })
        }
        target.couponCode ??= guest.couponCode
        delete db().carts[guest.id]
        return touch(target)
      }
      return HttpResponse.json(toCart(target))
    }),
  ),

  http.get(
    api('/cart/quote'),
    withNetwork(({ request }) => {
      const resolved = resolveCart(request)
      if ('error' in resolved) return resolved.error
      const requested = new URL(request.url).searchParams.get('network')
      const parsed = networkSchema.safeParse(requested ?? 'ethereum')
      if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'Rede inválida', { fields: { network: 'Rede inválida' } })
      return HttpResponse.json(computeQuote(resolved.cart, parsed.data))
    }),
  ),

  http.post(
    api('/orders'),
    withNetwork(async ({ request }) => {
      const auth = authenticate(request)
      if ('error' in auth) return auth.error
      const key = request.headers.get('Idempotency-Key')
      if (!key || key.length < 8) return fail(400, 'VALIDATION_ERROR', 'Idempotency-Key ausente ou inválida')
      const body = await readBody(request, createOrderBody)
      if (body.error) return body.error
      const user = auth.user
      const bodyHash = stableHash(body.data)

      const previous = db().idempotency[key]
      if (previous) {
        if (previous.userId !== user.id || previous.bodyHash !== bodyHash) {
          return fail(409, 'IDEMPOTENCY_CONFLICT', 'Esta tentativa de compra já foi usada com outros dados. Revise e confirme novamente.')
        }
        const existing = db().orders.find((o) => o.id === previous.orderId)!
        settleIfDue(existing)
        return HttpResponse.json(toOrder(existing))
      }

      const wallet = db().wallets.find((w) => w.id === body.data.walletId && w.userId === user.id)
      if (!wallet) {
        return fail(422, 'VALIDATION_ERROR', 'Selecione uma carteira cadastrada', { fields: { walletId: 'Carteira inválida' } })
      }
      const connection = db().connections[wallet.id]
      if (
        connection?.status !== 'connected' ||
        connection.network !== body.data.network ||
        connection.provider !== body.data.provider
      ) {
        return fail(409, 'WALLET_DISCONNECTED', 'Conecte a carteira na rede escolhida antes de confirmar a compra')
      }

      const cart = db().carts[`user:${user.id}`]
      if (!cart?.lines.length) return fail(409, 'QUOTE_STALE', 'Seu carrinho está vazio')
      const quote = computeQuote(cart, body.data.network)
      if (quote.id !== body.data.quoteId || !quote.purchasable) {
        return fail(409, 'QUOTE_STALE', 'Preço, disponibilidade ou taxas mudaram. Revise o pedido e confirme novamente.', {
          details: { quote },
        })
      }

      const touched = new Map<string, NftRecord>()
      for (const line of quote.lines) {
        const found = findEdition(line.nftId, line.editionId)!
        found.edition.available -= line.quantity
        found.nft.version += 1
        touched.set(found.nft.id, found.nft)
      }
      const createdAt = now()
      const order: OrderRecord = {
        id: nextId('ord'),
        userId: user.id,
        status: 'pending',
        version: 1,
        createdAt,
        updatedAt: createdAt,
        lines: quote.lines.map((l) => ({
          nftId: l.nftId,
          editionId: l.editionId,
          editionLabel: l.editionLabel,
          name: l.name,
          tokenId: l.tokenId,
          artwork: l.artwork,
          quantity: l.quantity,
          unitPriceEth: l.unitPriceEth,
          lineTotalEth: l.lineTotalEth,
        })),
        subtotalEth: quote.subtotalEth,
        discountEth: quote.discountEth,
        networkFeeEth: quote.networkFeeEth,
        totalEth: quote.totalEth,
        couponCode: quote.coupon?.status === 'applied' ? quote.coupon.code : null,
        network: body.data.network,
        wallet: { id: wallet.id, provider: body.data.provider, address: wallet.address, nickname: wallet.nickname },
        buyer: body.data.buyer,
        transaction: null,
        failureReason: null,
        settleAt: new Date(Date.now() + SETTLE_MS).toISOString(),
        outcome: scenario() === 'payment-declined' ? 'declined' : 'confirmed',
      }
      db().orders.push(order)
      db().idempotency[key] = { userId: user.id, bodyHash, orderId: order.id }
      persist()
      for (const nft of touched.values()) publish(nftUpdated(nft))
      scheduleSettlement(order)

      if (scenario() === 'order-timeout') await delay(ORDER_TIMEOUT_DELAY_MS)
      return HttpResponse.json(toOrder(order), { status: 201 })
    }),
  ),

  http.get(
    api('/orders'),
    withNetwork(({ request }) => {
      const auth = authenticate(request)
      if ('error' in auth) return auth.error
      const status = new URL(request.url).searchParams.get('status')
      const mine = db().orders.filter((o) => o.userId === auth.user.id)
      mine.forEach(settleIfDue)
      const items = mine.filter((o) => !status || o.status === status).map(toOrder)
      return HttpResponse.json({ items })
    }),
  ),

  http.get(
    api('/orders/:id'),
    withNetwork(({ request, params }) => {
      const auth = authenticate(request)
      if ('error' in auth) return auth.error
      const order = db().orders.find((o) => o.id === String(params.id))
      if (!order) return fail(404, 'NOT_FOUND', 'Pedido não encontrado')
      if (order.userId !== auth.user.id) return fail(403, 'FORBIDDEN', 'Este pedido pertence a outra conta')
      settleIfDue(order)
      return HttpResponse.json(toOrder(order))
    }),
  ),
]

