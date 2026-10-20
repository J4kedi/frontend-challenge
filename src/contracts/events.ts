import { z } from 'zod'
import { ethAmount, isoDateTime } from './common'
import { orderStatus } from './commerce'

/**
 * Socket.IO event envelope. `id` identifies the event (duplicates share it),
 * `version` is the version of the resource after the change: clients apply an
 * event only when it is newer than what they already hold.
 */
const envelope = {
  id: z.string(),
  version: z.number().int().min(1),
  occurredAt: isoDateTime,
}

export const nftUpdatedEvent = z.object({
  ...envelope,
  type: z.literal('nft.updated'),
  resource: z.object({ type: z.literal('nft'), id: z.string() }),
  data: z.object({
    priceEth: ethAmount,
    previousPriceEth: ethAmount.nullable(),
    available: z.number().int().min(0),
    editions: z.array(z.object({ id: z.string(), priceEth: ethAmount, available: z.number().int().min(0) })),
  }),
})
export type NftUpdatedEvent = z.infer<typeof nftUpdatedEvent>

export const orderUpdatedEvent = z.object({
  ...envelope,
  type: z.literal('order.updated'),
  resource: z.object({ type: z.literal('order'), id: z.string() }),
  /** Owner of the order: clients drop events addressed to another user. */
  userId: z.string(),
  data: z.object({
    status: orderStatus,
    failureReason: z.string().nullable(),
    transaction: z.object({ hash: z.string(), explorerUrl: z.string() }).nullable(),
  }),
})
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEvent>

export const realtimeEvent = z.discriminatedUnion('type', [nftUpdatedEvent, orderUpdatedEvent])
export type RealtimeEvent = z.infer<typeof realtimeEvent>

export const REALTIME_EVENT_TYPES = ['nft.updated', 'order.updated'] as const
