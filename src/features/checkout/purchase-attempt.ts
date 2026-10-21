import type { CreateOrderBody, Order } from '@/contracts/commerce'
import { ordersApi } from '@/features/orders/api'
import { isApiError } from '@/shared/api/errors'

/**
 * One purchase attempt = one idempotency key, persisted BEFORE the first POST.
 * - repeated clicks and automatic retries (timeout, network, 5xx) reuse the key,
 *   so the API returns the same order instead of creating another;
 * - a reload in the middle keeps the attempt, and confirming the same content
 *   again still reuses the key;
 * - any change in content (new quote, other wallet) starts a new attempt;
 * - an attempt whose payment was declined is over: trying again is a new purchase.
 */
interface Attempt {
  key: string
  body: CreateOrderBody
  orderId?: string
}

const storageKey = (userId: string) => `kurio:purchase-attempt:${userId}`
const RETRIES = 2

export function readAttempt(userId: string): Attempt | null {
  try {
    const raw = sessionStorage.getItem(storageKey(userId))
    return raw ? (JSON.parse(raw) as Attempt) : null
  } catch {
    return null
  }
}

function writeAttempt(userId: string, attempt: Attempt | null) {
  try {
    if (attempt) sessionStorage.setItem(storageKey(userId), JSON.stringify(attempt))
    else sessionStorage.removeItem(storageKey(userId))
  } catch {
    // Without storage the attempt still protects in-page retries.
  }
}

export const clearAttempt = (userId: string) => writeAttempt(userId, null)

const sameBody = (a: CreateOrderBody, b: CreateOrderBody) => JSON.stringify(a) === JSON.stringify(b)

const transient = (error: unknown) =>
  isApiError(error) && (error.code === 'TIMEOUT' || error.code === 'NETWORK_ERROR' || error.status >= 500)

export async function submitPurchase(userId: string, body: CreateOrderBody, wait = (ms: number) => new Promise((r) => setTimeout(r, ms))): Promise<Order> {
  const stored = readAttempt(userId)
  const attempt: Attempt = stored && sameBody(stored.body, body) ? stored : { key: crypto.randomUUID(), body }
  writeAttempt(userId, attempt)

  for (let tryNumber = 0; ; tryNumber++) {
    try {
      const order = await ordersApi.create(attempt.key, body)
      // Replaying the key of a declined order would only return that order again.
      if (attempt.orderId === order.id && order.status === 'declined') {
        writeAttempt(userId, null)
        return submitPurchase(userId, body, wait)
      }
      writeAttempt(userId, { ...attempt, orderId: order.id })
      return order
    } catch (error) {
      if (transient(error) && tryNumber < RETRIES) {
        await wait(1000 * (tryNumber + 1))
        continue
      }
      // A rejected attempt (stale quote, conflict) must not be replayed later.
      if (!transient(error)) writeAttempt(userId, null)
      throw error
    }
  }
}
