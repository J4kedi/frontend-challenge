import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { Session } from '@/contracts/account'
import { cartApi } from '@/features/cart/api'
import { clearDraft } from '@/features/checkout/draft'
import { clearAttempt } from '@/features/checkout/purchase-attempt'
import { announce } from '@/shared/a11y/announcer'
import { isApiError } from '@/shared/api/errors'
import { queryKeys, type CartOwner } from '@/shared/api/query-keys'
import { guestCartId, rotateGuestCartId, sessionStore, useStoredSession } from '@/shared/session/session-store'
import { authApi } from './api'

export const sessionQueryOptions = (token: string | null) =>
  queryOptions({
    queryKey: queryKeys.session(token),
    queryFn: ({ signal }) => (token ? authApi.session(signal) : null),
    staleTime: 5 * 60_000,
    retry: (count, error) => !(isApiError(error) && error.status === 401) && count < 2,
  })

/** Current collector. `isAuthenticated` only turns true once the API confirmed the stored token. */
export function useSession() {
  const stored = useStoredSession()
  const query = useQuery(sessionQueryOptions(stored?.token ?? null))
  return {
    user: query.data?.user ?? null,
    isAuthenticated: Boolean(stored && query.data),
    isChecking: Boolean(stored) && query.isPending,
  }
}

export const cartOwnerOf = (userId: string | null): CartOwner => (userId ? ['user', userId] : ['guest', guestCartId()])

/** Whose cart the UI shows: the collector's when signed in, this browser's visitor cart otherwise. */
export function useCartOwner(): CartOwner {
  const userId = useStoredSession()?.userId ?? null
  return useMemo(() => cartOwnerOf(userId), [userId])
}

/**
 * Starts a session: stores the token, drops any other user's private cache and
 * moves the visitor's cart into the account (the API merges quantities within
 * stock and per-order limits).
 */
export async function signIn(queryClient: QueryClient, next: Session) {
  const previousUserId = sessionStore.userId()
  if (previousUserId && previousUserId !== next.user.id) {
    queryClient.removeQueries({ queryKey: queryKeys.user(previousUserId).all })
  }
  const guestId = guestCartId()
  sessionStore.set({ token: next.token, userId: next.user.id, expiresAt: next.expiresAt })
  queryClient.setQueryData(queryKeys.session(next.token), next)
  try {
    const merged = await cartApi.merge(guestId)
    rotateGuestCartId()
    // The account cart (and its quote) started loading when the session switched,
    // before the merge: an answer read before it must not overwrite the merged cart.
    const owner: CartOwner = ['user', next.user.id]
    await queryClient.cancelQueries({ queryKey: queryKeys.cart(owner) })
    queryClient.setQueryData(queryKeys.cart(owner), merged)
    void queryClient.invalidateQueries({ queryKey: [...queryKeys.cart(owner), 'quote'] })
  } catch {
    // The visitor cart stays where it was; the account cart loads normally.
  }
  queryClient.removeQueries({ queryKey: ['guest'] })
  announce(`Você entrou como ${next.user.displayName}.`)
}

/** Ends the session on this device: private queries of the user go away with it. */
export function signOutLocally(queryClient: QueryClient) {
  const userId = sessionStore.userId()
  sessionStore.set(null)
  if (userId) queryClient.removeQueries({ queryKey: queryKeys.user(userId).all })
  queryClient.removeQueries({ queryKey: ['session'] })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: authApi.login, onSuccess: (session) => signIn(queryClient, session) })
}

export function useSignup() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: authApi.signup, onSuccess: (session) => signIn(queryClient, session) })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => authApi.logout().catch(() => undefined),
    onSettled: () => {
      // Leaving on purpose drops what checkout kept in this browser (name, e-mail,
      // ENS). An expired session keeps it, so signing in again resumes the form.
      const userId = sessionStore.userId()
      if (userId) {
        clearDraft(userId)
        clearAttempt(userId)
      }
      signOutLocally(queryClient)
      announce('Você saiu da sua conta.')
    },
  })
}

/** Only internal paths are accepted as post-login destinations (no open redirect). */
export function safeRedirect(target: string | undefined) {
  return target && target.startsWith('/') && !target.startsWith('//') ? target : '/'
}
