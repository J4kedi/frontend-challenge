import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { favorites, type Favorites } from '@/contracts/account'
import { loginPrompt } from '@/features/auth/login-prompt'
import { sessionQueryOptions, useSession } from '@/features/auth/session'
import { announce } from '@/shared/a11y/announcer'
import { request } from '@/shared/api/client'
import { queryKeys } from '@/shared/api/query-keys'
import { sessionStore } from '@/shared/session/session-store'

const favoritesApi = {
  list: (signal?: AbortSignal) => request(favorites, { url: '/me/favorites', signal }),
  add: (nftId: string) => request(favorites, { method: 'PUT', url: `/me/favorites/${encodeURIComponent(nftId)}` }),
  remove: (nftId: string) => request(favorites, { method: 'DELETE', url: `/me/favorites/${encodeURIComponent(nftId)}` }),
}

export const favoritesOptions = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.user(userId).favorites,
    queryFn: ({ signal }) => favoritesApi.list(signal),
  })

export function useFavorites() {
  const { user } = useSession()
  return useQuery({ ...favoritesOptions(user?.id ?? 'anonymous'), enabled: Boolean(user) })
}

export function useIsFavorite(nftId: string) {
  const { data } = useFavorites()
  return data?.nftIds.includes(nftId) ?? false
}

/**
 * Optimistic toggle (the challenge's required optimistic interaction): the
 * heart flips immediately, and a failed request restores the previous list.
 * Visitors sign in over the same page, and the favorite is saved right after.
 */
const FAVORITE_WRITE = ['favorite-write']

export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const { user } = useSession()

  const mutation = useMutation({
    mutationKey: FAVORITE_WRITE,
    // In click order: a quick add-then-remove must not reach the API reversed.
    scope: { id: 'favorites' },
    mutationFn: ({ nftId, favorite }: { nftId: string; favorite: boolean; name: string }) =>
      favorite ? favoritesApi.add(nftId) : favoritesApi.remove(nftId),
    onMutate: async ({ nftId, favorite }) => {
      // Read at call time: after a sign-in prompt the hook has not re-rendered yet.
      const key = queryKeys.user(sessionStore.userId()!).favorites
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Favorites>(key)
      const ids = new Set(previous?.nftIds ?? [])
      if (favorite) ids.add(nftId)
      else ids.delete(nftId)
      queryClient.setQueryData<Favorites>(key, { nftIds: [...ids] })
      return { previous, key }
    },
    onError: (_error, { name }, context) => {
      if (context) queryClient.setQueryData(context.key, context.previous)
      toast.error(`Não foi possível atualizar ${name} na sua lista. Tente novamente.`)
      announce(`Falha ao atualizar ${name} na lista de interesse. O estado anterior foi restaurado.`)
    },
    onSettled: (_data, _error, _variables, context) => {
      // Rollbacks of queued writes restore each other's optimistic state: after the
      // last write, re-read the list so the screen ends where the server is.
      if (context && queryClient.isMutating({ mutationKey: FAVORITE_WRITE }) === 1) {
        void queryClient.invalidateQueries({ queryKey: context.key })
      }
    },
    onSuccess: async (data, { favorite, name }, context) => {
      // A list fetched before this write (e.g. right after sign-in) must not overwrite it.
      await queryClient.cancelQueries({ queryKey: context.key })
      // A later toggle is still queued: its response carries the final list.
      if (queryClient.isMutating({ mutationKey: FAVORITE_WRITE }) === 1) queryClient.setQueryData(context.key, data)
      announce(favorite ? `${name} adicionado à lista de interesse.` : `${name} removido da lista de interesse.`)
    },
  })

  return {
    isPending: mutation.isPending,
    async toggle(nftId: string, name: string, currentlyFavorite: boolean) {
      // A stored session still being confirmed (right after a reload) is not a
      // visitor: wait for it instead of asking a signed-in collector to log in.
      const token = sessionStore.token()
      const signedIn =
        user ?? (token ? await queryClient.fetchQuery(sessionQueryOptions(token)).then((session) => session?.user ?? null, () => null) : null)
      if (!signedIn) {
        loginPrompt.open({
          reason: `${name} vai para a sua lista de interesse assim que você entrar.`,
          // Add, not toggle: the account may already have it.
          onSignedIn: () =>
            mutation.mutate({ nftId, favorite: true, name }, { onSuccess: () => toast.success(`${name} salvo na sua lista de interesse.`) }),
        })
        return
      }
      mutation.mutate({ nftId, favorite: !currentlyFavorite, name })
    },
  }
}
