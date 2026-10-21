import { HeartIcon } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { useIsFavorite, useToggleFavorite } from './queries'

/**
 * Heart toggle. `aria-pressed` carries the state for assistive tech; the
 * filled heart (shape, not only color) carries it visually.
 */
export function FavoriteButton({
  nftId,
  name,
  variant = 'overlay',
  className,
}: {
  nftId: string
  name: string
  variant?: 'overlay' | 'outline'
  className?: string
}) {
  const isFavorite = useIsFavorite(nftId)
  const { toggle, isPending } = useToggleFavorite()

  return (
    <button
      type="button"
      aria-pressed={isFavorite}
      aria-label={isFavorite ? `Remover ${name} da lista de interesse` : `Adicionar ${name} à lista de interesse`}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void toggle(nftId, name, isFavorite)
      }}
      aria-busy={isPending || undefined}
      className={cn(
        variant === 'overlay'
          ? 'grid size-8 place-items-center rounded-full bg-surface/80 text-primary backdrop-blur hover:bg-surface'
          : 'inline-flex h-10 items-center gap-2 rounded-sm border border-foreground px-4 text-body-lg font-medium text-foreground hover:border-primary hover:text-accent',
        className,
      )}
    >
      <HeartIcon className={cn('size-4', isFavorite && 'fill-current')} aria-hidden="true" />
      {variant === 'outline' && (isFavorite ? 'Favoritado' : 'Favoritar')}
    </button>
  )
}
