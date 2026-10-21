import { useQueries } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ErrorState } from '@/components/feedback/StatusPage'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { Button } from '@/components/ui/button'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/NftCard'
import { nftDetailOptions } from '@/features/catalog/queries'
import { useFavorites } from './queries'

/** Lista de interesse: the favorites of the signed-in collector (persisted by the API). */
export function FavoritesPage() {
  const favorites = useFavorites()
  const ids = favorites.data?.nftIds ?? []
  const details = useQueries({ queries: ids.map((id) => nftDetailOptions(id)) })

  return (
    <section className="mx-auto max-w-page px-4 pt-8 md:px-6 xl:px-0" aria-labelledby="favorites-title">
      <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: 'Lista de interesse' }]} />
      <h1 id="favorites-title" className="mt-4 text-heading font-bold">
        Lista de interesse
      </h1>
      {favorites.isPending ? (
        <ul className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i}>
              <NftCardSkeleton />
            </li>
          ))}
        </ul>
      ) : favorites.isError ? (
        <div className="mt-8">
          <ErrorState error={favorites.error} onRetry={() => void favorites.refetch()} />
        </div>
      ) : ids.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-lg border border-border-soft bg-surface px-6 py-16 text-center">
          <p className="text-title-sm font-bold">Sua lista está vazia</p>
          <p className="text-body-sm text-muted-foreground">Toque no coração de um NFT para guardá-lo aqui.</p>
          <Button asChild variant="outline">
            <Link to="/" hash="mercado">
              Explorar o mercado
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
          {details.map((detail, index) => (
            <li key={ids[index]}>
              {detail.data ? (
                <NftCard nft={detail.data} />
              ) : detail.isError ? (
                <div
                  role="alert"
                  className="flex aspect-[175/200] flex-col items-center justify-center gap-3 rounded-[20px] bg-surface p-4 text-center text-body-sm text-muted-foreground md:aspect-[258/300] md:rounded-none"
                >
                  Não foi possível carregar este NFT.
                  <Button size="sm" variant="outline" onClick={() => void detail.refetch()}>
                    Tentar novamente
                  </Button>
                </div>
              ) : (
                <NftCardSkeleton />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
