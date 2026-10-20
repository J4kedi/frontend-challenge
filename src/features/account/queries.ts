import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Session, User, Wallet, WalletFields, WalletSlot, ConnectWalletBody } from '@/contracts/account'
import { useSession } from '@/features/auth/session'
import { queryKeys } from '@/shared/api/query-keys'
import { sessionStore } from '@/shared/session/session-store'
import { accountApi } from './api'

export const profileOptions = (userId: string) =>
  queryOptions({ queryKey: queryKeys.user(userId).profile, queryFn: ({ signal }) => accountApi.profile(signal) })

export const walletsOptions = (userId: string) =>
  queryOptions({ queryKey: queryKeys.user(userId).wallets, queryFn: ({ signal }) => accountApi.wallets(signal) })

function useUserId() {
  const { user } = useSession()
  return user?.id ?? sessionStore.userId() ?? 'anonymous'
}

export function useProfile() {
  return useQuery(profileOptions(useUserId()))
}

export function useWallets() {
  return useQuery(walletsOptions(useUserId()))
}

/** A changed profile is also the header's user: keep the session copy in sync. */
function useStoreUser() {
  const queryClient = useQueryClient()
  return (next: User) => {
    queryClient.setQueryData(queryKeys.user(next.id).profile, next)
    queryClient.setQueryData<Session | null>(queryKeys.session(sessionStore.token()), (session) =>
      session ? { ...session, user: next } : session,
    )
  }
}

export function useUpdateProfile() {
  const store = useStoreUser()
  return useMutation({ mutationFn: accountApi.updateProfile, onSuccess: store })
}

export function useAvatar() {
  const store = useStoreUser()
  const set = useMutation({ mutationFn: accountApi.setAvatar, onSuccess: store })
  const remove = useMutation({ mutationFn: accountApi.removeAvatar, onSuccess: store })
  return { set, remove }
}

export function useChangePassword() {
  return useMutation({ mutationFn: accountApi.changePassword })
}

function useStoreWallet() {
  const queryClient = useQueryClient()
  const userId = useUserId()
  return (next: Wallet) => {
    queryClient.setQueryData<{ items: Wallet[] }>(queryKeys.user(userId).wallets, (list) => {
      const items = list?.items ?? []
      return { items: items.some((w) => w.id === next.id) ? items.map((w) => (w.id === next.id ? next : w)) : [...items, next] }
    })
  }
}

export function useSaveWallet() {
  const store = useStoreWallet()
  return useMutation({
    mutationFn: ({ id, slot, body }: { id?: string; slot: WalletSlot; body: WalletFields }) =>
      id ? accountApi.updateWallet(id, body) : accountApi.createWallet(slot, body),
    onSuccess: store,
  })
}

export function useWalletConnection() {
  const store = useStoreWallet()
  const connect = useMutation({
    mutationFn: ({ id, body }: { id: string; body: ConnectWalletBody }) => accountApi.connectWallet(id, body),
    onSuccess: store,
  })
  const disconnect = useMutation({ mutationFn: (id: string) => accountApi.disconnectWallet(id), onSuccess: store })
  return { connect, disconnect }
}
