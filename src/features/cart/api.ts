import { addCartItemBody, cart, quote, type AddCartItemBody } from '@/contracts/commerce'
import type { Network } from '@/contracts/nft'
import { request } from '@/shared/api/client'

export const cartApi = {
  get: (signal?: AbortSignal) => request(cart, { url: '/cart', signal }),
  add: (body: AddCartItemBody) => request(cart, { method: 'POST', url: '/cart/items', data: addCartItemBody.parse(body) }),
  update: (lineId: string, quantity: number) =>
    request(cart, { method: 'PATCH', url: `/cart/items/${encodeURIComponent(lineId)}`, data: { quantity } }),
  remove: (lineId: string) => request(cart, { method: 'DELETE', url: `/cart/items/${encodeURIComponent(lineId)}` }),
  acknowledgePrices: () => request(cart, { method: 'POST', url: '/cart/acknowledge' }),
  applyCoupon: (code: string) => request(cart, { method: 'PUT', url: '/cart/coupon', data: { code } }),
  removeCoupon: () => request(cart, { method: 'DELETE', url: '/cart/coupon' }),
  merge: (guestCartId: string) => request(cart, { method: 'POST', url: '/cart/merge', data: { guestCartId } }),
  quote: (network: Network, signal?: AbortSignal) => request(quote, { url: '/cart/quote', params: { network }, signal }),
}
