import { z } from 'zod'

/** ETH travels as a decimal string (up to 18 fraction digits) so no precision is lost on the way. */
export const ethAmount = z.string().regex(/^\d+(\.\d{1,18})?$/, 'Valor em ETH inválido')
export type EthAmount = z.infer<typeof ethAmount>

export const isoDateTime = z.iso.datetime({ offset: true })

export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'SESSION_EXPIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'EMAIL_TAKEN',
  'USERNAME_TAKEN',
  'INVALID_CREDENTIALS',
  'OUT_OF_STOCK',
  'QUANTITY_LIMIT',
  'QUOTE_STALE',
  'COUPON_INVALID',
  'COUPON_EXPIRED',
  'IDEMPOTENCY_CONFLICT',
  'ORDER_IN_PROGRESS',
  'WALLET_REJECTED',
  'WALLET_DISCONNECTED',
  'WALLET_SLOT_TAKEN',
  'UNAVAILABLE',
  'INTERNAL',
] as const
export const errorCode = z.enum(ERROR_CODES)
export type ErrorCode = z.infer<typeof errorCode>

/** Every non-2xx response carries this body. `fields` maps form field names to messages. */
export const apiErrorBody = z.object({
  error: z.object({
    code: errorCode,
    message: z.string(),
    fields: z.record(z.string(), z.string()).optional(),
    retryable: z.boolean().optional(),
    details: z.unknown().optional(),
  }),
})
export type ApiErrorBody = z.infer<typeof apiErrorBody>

export function pageOf<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  })
}
