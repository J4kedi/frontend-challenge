import { user, wallet, walletList, type ConnectWalletBody, type ProfileUpdateBody, type WalletFields, type WalletSlot } from '@/contracts/account'
import { request } from '@/shared/api/client'

export const accountApi = {
  profile: (signal?: AbortSignal) => request(user, { url: '/me/profile', signal }),
  updateProfile: (body: ProfileUpdateBody) => request(user, { method: 'PATCH', url: '/me/profile', data: body }),
  setAvatar: (dataUrl: string) => request(user, { method: 'PUT', url: '/me/avatar', data: { dataUrl } }),
  removeAvatar: () => request(user, { method: 'DELETE', url: '/me/avatar' }),

  wallets: (signal?: AbortSignal) => request(walletList, { url: '/me/wallets', signal }),
  createWallet: (slot: WalletSlot, body: WalletFields) => request(wallet, { method: 'POST', url: '/me/wallets', data: { slot, ...body } }),
  updateWallet: (id: string, body: WalletFields) => request(wallet, { method: 'PATCH', url: `/me/wallets/${encodeURIComponent(id)}`, data: body }),
  connectWallet: (id: string, body: ConnectWalletBody) =>
    request(wallet, { method: 'POST', url: `/me/wallets/${encodeURIComponent(id)}/connect`, data: body }),
  disconnectWallet: (id: string) => request(wallet, { method: 'POST', url: `/me/wallets/${encodeURIComponent(id)}/disconnect` }),
}
