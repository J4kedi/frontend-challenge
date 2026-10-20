import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { toast } from 'sonner'
import { favorites, type Favorites } from '@/contracts/account'
import { useSession } from '@/features/auth/session'
import { announce } from '@/shared/a11y/announcer'
import { request } from '@/shared/api/client'
import { queryKeys } from '@/shared/api/query-keys'

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
 * Visitors are sent to login and come back to the same page.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const navigate = useNavigate()
  const href = useRouterState({ select: (s) => s.location.href })

  const mutation = useMutation({
    mutationFn: ({ nftId, favorite }: { nftId: string; favorite: boolean; name: string }) =>
      favorite ? favoritesApi.add(nftId) : favoritesApi.remove(nftId),
    onMutate: async ({ nftId, favorite }) => {
      const key = queryKeys.user(user!.id).favorites
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
    onSuccess: (data, { favorite, name }, context) => {
      queryClient.setQueryData(context.key, data)
      announce(favorite ? `${name} adicionado à lista de interesse.` : `${name} removido da lista de interesse.`)
    },
  })

  return {
    isPending: mutation.isPending,
    toggle(nftId: string, name: string, currentlyFavorite: boolean) {
      if (!user) {
        toast.info('Entre na sua conta para salvar favoritos.')
        void navigate({ to: '/login', search: { redirect: href } })
        return
      }
      mutation.mutate({ nftId, favorite: !currentlyFavorite, name })
    },
  }
}
