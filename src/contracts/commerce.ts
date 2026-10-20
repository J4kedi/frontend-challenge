import { z } from 'zod'
import { email, ENS_PATTERN, USERNAME_PATTERN, walletProvider } from './account'
import { ethAmount, isoDateTime } from './common'
import { artwork, network } from './nft'

export const cartLine = z.object({
  id: z.string(),
  nftId: z.string(),
  editionId: z.string(),
  editionLabel: z.string(),
  name: z.string(),
  tokenId: z.string(),
  artwork,
  network,
  quantity: z.number().int().min(1),
  unitPriceEth: ethAmount,
  /** Price the collector last saw for this line; differs from unitPriceEth after a price change. */
  acknowledgedPriceEth: ethAmount,
  available: z.number().int().min(0),
  maxPerOrder: z.number().int().min(1),
})
export type CartLine = z.infer<typeof cartLine>

export const cart = z.object({
  id: z.string(),
  lines: z.array(cartLine),
  couponCode: z.string().nullable(),
  version: z.number().int().min(0),
})
export type Cart = z.infer<typeof cart>

export const addCartItemBody = z.object({
  nftId: z.string(),
  editionId: z.string(),
  quantity: z.number().int().min(1),
})
export type AddCartItemBody = z.infer<typeof addCartItemBody>

export const updateCartItemBody = z.object({ quantity: z.number().int().min(1) })
export const couponBody = z.object({ code: z.string().trim().min(1, 'Informe o código promocional') })
export const mergeCartBody = z.object({ guestCartId: z.string() })

export const QUOTE_LINE_STATUSES = ['ok', 'price-changed', 'insufficient', 'unavailable'] as const

export const quoteLine = z.object({
  lineId: z.string(),
  nftId: z.string(),
  editionId: z.string(),
  editionLabel: z.string(),
  name: z.string(),
  tokenId: z.string(),
  artwork,
  quantity: z.number().int(),
  unitPriceEth: ethAmount,
  previousUnitPriceEth: ethAmount.nullable(),
  lineTotalEth: ethAmount,
  available: z.number().int(),
  status: z.enum(QUOTE_LINE_STATUSES),
})
export type QuoteLine = z.infer<typeof quoteLine>

export const quote = z.object({
  /** Content hash: any change in price, stock, coupon or fee yields a new id. */
  id: z.string(),
  cartVersion: z.number().int(),
  network,
  lines: z.array(quoteLine),
  subtotalEth: ethAmount,
  discountEth: ethAmount,
  networkFeeEth: ethAmount,
  totalEth: ethAmount,
  coupon: z
    .object({
      code: z.string(),
      status: z.enum(['applied', 'invalid', 'expired']),
      percentOff: z.number().nullable(),
      message: z.string(),
    })
    .nullable(),
  purchasable: z.boolean(),
  createdAt: isoDateTime,
})
export type Quote = z.infer<typeof quote>

export const quoteBody = z.object({ network: network.optional() })

export const ORDER_STATUSES = ['pending', 'confirmed', 'declined'] as const
export const orderStatus = z.enum(ORDER_STATUSES)
export type OrderStatus = z.infer<typeof orderStatus>

export const checkoutBuyer = z.object({
  displayName: z.string().trim().min(1, 'Nome de exibição é obrigatório'),
  username: z
    .string()
    .trim()
    .min(1, 'Nome de usuário é obrigatório')
    .regex(USERNAME_PATTERN, 'Use 3 a 20 letras minúsculas, números, ponto ou _'),
  profileName: z.string().trim().min(1, 'Nome do perfil é obrigatório'),
  email,
  ensName: z.string().trim().min(1, 'Nome ENS é obrigatório').regex(ENS_PATTERN, 'Use 3 a 32 letras minúsculas, números ou hífen'),
  referralCode: z
    .string()
    .trim()
    .min(1, 'Código de indicação é obrigatório')
    .regex(/^[A-Za-z0-9-]{4,16}$/, 'Use 4 a 16 letras, números ou hífen'),
  note: z.string().max(500, 'Use até 500 caracteres').optional(),
})
export type CheckoutBuyer = z.infer<typeof checkoutBuyer>

export const createOrderBody = z.object({
  quoteId: z.string(),
  network,
  walletId: z.string(),
  provider: walletProvider,
  buyer: checkoutBuyer,
})
export type CreateOrderBody = z.infer<typeof createOrderBody>

export const orderLine = z.object({
  nftId: z.string(),
  editionId: z.string(),
  editionLabel: z.string(),
  name: z.string(),
  tokenId: z.string(),
  artwork,
  quantity: z.number().int(),
  unitPriceEth: ethAmount,
  lineTotalEth: ethAmount,
})
export type OrderLine = z.infer<typeof orderLine>

/** The order is a snapshot: later catalog changes never alter these values. */
export const order = z.object({
  id: z.string(),
  status: orderStatus,
  version: z.number().int().min(1),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  lines: z.array(orderLine),
  subtotalEth: ethAmount,
  discountEth: ethAmount,
  networkFeeEth: ethAmount,
  totalEth: ethAmount,
  couponCode: z.string().nullable(),
  network,
  wallet: z.object({ id: z.string(), provider: walletProvider, address: z.string(), nickname: z.string() }),
  buyer: checkoutBuyer,
  transaction: z.object({ hash: z.string(), explorerUrl: z.string() }).nullable(),
  failureReason: z.string().nullable(),
})
export type Order = z.infer<typeof order>
