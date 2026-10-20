import { z } from 'zod'
import { order, type CreateOrderBody } from '@/contracts/commerce'
import { request } from '@/shared/api/client'

export const ordersApi = {
  /** The idempotency key identifies one purchase attempt: retries reuse it. */
  create: (idempotencyKey: string, body: CreateOrderBody) =>
    request(order, { method: 'POST', url: '/orders', data: body, headers: { 'Idempotency-Key': idempotencyKey } }),
  get: (id: string, signal?: AbortSignal) => request(order, { url: `/orders/${encodeURIComponent(id)}`, signal }),
  pending: (signal?: AbortSignal) =>
    request(z.object({ items: z.array(order) }), { url: '/orders', params: { status: 'pending' }, signal }),
}
