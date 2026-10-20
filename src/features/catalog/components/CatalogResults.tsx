import { Link } from '@tanstack/react-router'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { ErrorState } from '@/components/feedback/StatusPage'
import { Button } from '@/components/ui/button'
import type { NftListResponse } from '@/contracts/nft'
import { cn } from '@/shared/lib/cn'
import { PAGE_SIZE } from '../search'
import { NftCard, NftCardSkeleton } from './NftCard'

/**
 * Result grid with every state of the list: skeleton on first load, previous
 * page dimmed while the next one loads (aria-busy), error with retry, empty.
 */
export function CatalogResults({
  data,
  isPending,
  isFetching,
  error,
  onRetry,
  onClear,
}: {
  data: NftListResponse | undefined
  isPending: boolean
  isFetching: boolean
  error: unknown
  onRetry: () => void
  onClear: () => void
}) {
  if (isPending) {
    return (
      <div aria-busy="true">
        <p role="status" className="sr-only">
          Carregando NFTs…
        </p>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:gap-x-11 lg:gap-y-10" data-testid="catalog-skeleton">
          {Array.from({ length: PAGE_SIZE }, (_, i) => (
            <li key={i}>
              <NftCardSkeleton />
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (!data) return <ErrorState error={error} onRetry={onRetry} title="Não foi possível carregar o catálogo" />

  return (
    <div aria-busy={isFetching} className={cn('transition-opacity', isFetching && 'opacity-60')}>
      <p role="status" className="sr-only" data-testid="catalog-status">
        {data.total === 1 ? '1 NFT encontrado' : `${data.total} NFTs encontrados`}
      </p>
      {error && !isFetching ? (
        <div className="mb-6">
          <ErrorState error={error} onRetry={onRetry} title="Não foi possível atualizar o catálogo" />
        </div>
      ) : null}
      {data.items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border-soft bg-surface px-6 py-16 text-center" data-testid="catalog-empty">
          <p className="text-title-sm font-bold">Nenhum NFT encontrado</p>
          <p className="max-w-sm text-body-sm text-muted-foreground">
            Tente outro termo de busca ou remova alguns filtros para ver mais resultados.
          </p>
          <Button variant="outline" onClick={onClear}>
            Limpar filtros
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:gap-x-11 lg:gap-y-10">
          {data.items.map((nft, index) => (
            <li key={nft.id}>
              <NftCard nft={nft} priority={index < 3} />
            </li>
          ))}
        </ul>
      )}
      <Pagination page={data.page} totalPages={data.totalPages} />
    </div>
  )
}

function pagesAround(page: number, total: number) {
  const start = Math.max(1, Math.min(page - 1, total - 3))
  return Array.from({ length: Math.min(4, total) }, (_, i) => start + i)
}

function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null
  const item = 'grid size-9 place-items-center rounded-sm border border-border-soft text-body-sm font-medium text-foreground hover:border-primary'
  return (
    <nav aria-label="Paginação do catálogo" className="mt-12 flex justify-end">
      <ul className="flex items-center gap-2">
        <li>
          {page > 1 ? (
            <Link to="/" hash="mercado" search={(prev) => ({ ...prev, page: page - 1 })} className={item} aria-label="Página anterior">
              <ChevronLeftIcon className="size-4" aria-hidden="true" />
            </Link>
          ) : null}
        </li>
        {pagesAround(page, totalPages).map((n) => (
          <li key={n}>
            <Link
              to="/"
              hash="mercado"
              search={(prev) => ({ ...prev, page: n === 1 ? undefined : n })}
              aria-current={n === page ? 'page' : undefined}
              aria-label={`Página ${n}`}
              className={cn(item, n === page && 'border-primary bg-primary font-bold text-ink')}
            >
              {n}
            </Link>
          </li>
        ))}
        <li>
          {page < totalPages ? (
            <Link to="/" hash="mercado" search={(prev) => ({ ...prev, page: page + 1 })} className={item} aria-label="Próxima página">
              <ChevronRightIcon className="size-4" aria-hidden="true" />
            </Link>
          ) : null}
        </li>
      </ul>
      <p className="sr-only">
        Página {page} de {totalPages}
      </p>
    </nav>
  )
}
