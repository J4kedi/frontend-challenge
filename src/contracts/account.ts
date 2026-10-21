import { z } from 'zod'
import { isoDateTime } from './common'
import { network } from './nft'

const required = (label: string) => z.string().trim().min(1, `${label} é obrigatório`)

export const email = z.string().trim().min(1, 'E-mail é obrigatório').pipe(z.email('E-mail inválido'))
export const password = z
  .string()
  .min(8, 'A senha precisa de pelo menos 8 caracteres')
  .regex(/[A-Za-z]/, 'A senha precisa de pelo menos uma letra')
  .regex(/\d/, 'A senha precisa de pelo menos um número')

export const user = z.object({
  id: z.string(),
  displayName: z.string(),
  username: z.string(),
  email: z.string(),
  ensName: z.string(),
  walletNickname: z.string(),
  avatarUrl: z.string().nullable(),
  updatedAt: isoDateTime,
})
export type User = z.infer<typeof user>

export const session = z.object({
  token: z.string(),
  expiresAt: isoDateTime,
  user,
})
export type Session = z.infer<typeof session>

export const loginBody = z.object({
  email,
  password: z.string().min(1, 'Senha é obrigatória'),
})
export type LoginBody = z.infer<typeof loginBody>

export const signupBody = z
  .object({
    username: required('Nome de usuário').regex(/^[a-z0-9_.]{3,20}$/, 'Use 3 a 20 letras minúsculas, números, ponto ou _'),
    email,
    password,
    confirmPassword: z.string().min(1, 'Confirme a senha'),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'As senhas não conferem' })
export type SignupBody = z.infer<typeof signupBody>

export const USERNAME_PATTERN = /^[a-z0-9_.]{3,20}$/
export const ENS_PATTERN = /^[a-z0-9-]{3,32}$/

export const profileBody = z.object({
  displayName: required('Nome de exibição'),
  username: required('Nome de usuário').regex(USERNAME_PATTERN, 'Use 3 a 20 letras minúsculas, números, ponto ou _'),
  email,
  ensName: required('Nome ENS').regex(ENS_PATTERN, 'Use 3 a 32 letras minúsculas, números ou hífen'),
  walletNickname: required('Apelido da carteira'),
})
export type ProfileBody = z.infer<typeof profileBody>

export const MAX_AVATAR_BYTES = 1_000_000
export const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
export const avatarBody = z.object({
  /** data: URL of the image; the mock stores it as the new avatar. */
  dataUrl: z.string().regex(/^data:image\/(png|jpeg|webp);base64,/, 'Envie uma imagem PNG, JPG ou WebP'),
})

export const passwordBody = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    newPassword: password,
    confirmPassword: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem',
  })
export type PasswordBody = z.infer<typeof passwordBody>

/** PATCH /me/profile: the profile and, optionally, a password change checked with it (all or nothing). */
export const profileUpdateBody = profileBody.extend({ password: passwordBody.optional() })
export type ProfileUpdateBody = z.infer<typeof profileUpdateBody>

export const WALLET_PROVIDERS = ['metamask', 'walletconnect', 'coinbase'] as const
export const walletProvider = z.enum(WALLET_PROVIDERS)
export type WalletProvider = z.infer<typeof walletProvider>
export const WALLET_PROVIDER_LABEL: Record<WalletProvider, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
}

export const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/
export const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export function isValidAddress(address: string, net: z.infer<typeof network>) {
  return net === 'solana' ? SOLANA_ADDRESS.test(address) : EVM_ADDRESS.test(address)
}

export const WALLET_SLOTS = ['primary', 'secondary'] as const
export const walletSlot = z.enum(WALLET_SLOTS)
export type WalletSlot = z.infer<typeof walletSlot>

/** Same fields as the "Perfil do colecionador" block of the checkout (Figma: Carteiras, Pagamento). */
export const walletFields = z
  .object({
    displayName: required('Nome de exibição'),
    nickname: required('Apelido da carteira'),
    network: network.optional().refine((v) => v !== undefined, 'Selecione uma rede'),
    profileName: required('Nome do perfil'),
    address: required('Endereço da carteira'),
    secondaryAddress: z.string().trim().optional(),
    provider: walletProvider.optional().refine((v) => v !== undefined, 'Selecione uma carteira'),
    referralCode: required('Código de indicação').regex(/^[A-Za-z0-9-]{4,16}$/, 'Use 4 a 16 letras, números ou hífen'),
    email,
    ensName: required('Nome ENS').regex(ENS_PATTERN, 'Use 3 a 32 letras minúsculas, números ou hífen'),
  })
  .superRefine((v, ctx) => {
    if (v.network && v.address && !isValidAddress(v.address, v.network)) {
      ctx.addIssue({
        code: 'custom',
        path: ['address'],
        message: v.network === 'solana' ? 'Endereço Solana inválido' : 'Endereço inválido: use 0x + 40 caracteres hexadecimais',
      })
    }
  })
export type WalletFields = z.infer<typeof walletFields>

export const wallet = z.object({
  id: z.string(),
  slot: walletSlot,
  displayName: z.string(),
  nickname: z.string(),
  network,
  profileName: z.string(),
  address: z.string(),
  secondaryAddress: z.string().nullable(),
  provider: walletProvider,
  referralCode: z.string(),
  email: z.string(),
  ensName: z.string(),
  updatedAt: isoDateTime,
  /** Simulated wallet-extension connection used at checkout. */
  connection: z
    .object({ provider: walletProvider, network, status: z.enum(['connected', 'disconnected']) })
    .nullable(),
})
export type Wallet = z.infer<typeof wallet>

export const walletList = z.object({ items: z.array(wallet) })

export const connectWalletBody = z.object({ provider: walletProvider, network })
export type ConnectWalletBody = z.infer<typeof connectWalletBody>

export const favorites = z.object({ nftIds: z.array(z.string()) })
export type Favorites = z.infer<typeof favorites>
