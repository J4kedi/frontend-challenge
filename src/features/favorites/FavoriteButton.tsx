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
  hoverReveal = false,
  className,
}: {
  nftId: string
  name: string
  variant?: 'overlay' | 'outline'
  /** Card heart: with a mouse, shows on hover or focus (Figma card hover) and stays once favorited. */
  hoverReveal?: boolean
  className?: string
}) {
  const { isFavorite, loading } = useIsFavorite(nftId)
  const { toggle, isPending } = useToggleFavorite()

  return (
    <button
      type="button"
      aria-pressed={isFavorite}
      aria-label={
        variant === 'outline'
          ? // Starts with the visible text, so speech input users can say what they see (WCAG 2.5.3).
            `${isFavorite ? 'Favoritado' : 'Favoritar'}: ${isFavorite ? `remover ${name} da` : `adicionar ${name} à`} lista de interesse`
          : isFavorite
            ? `Remover ${name} da lista de interesse`
            : `Adicionar ${name} à lista de interesse`
      }
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void toggle(nftId, name, isFavorite)
      }}
      disabled={loading}
      aria-busy={loading || isPending || undefined}
      className={cn(
        'disabled:cursor-progress disabled:opacity-60',
        hoverReveal && !isFavorite && 'md:pointer-fine:opacity-0 md:pointer-fine:group-hover:opacity-100 md:pointer-fine:focus-visible:opacity-100',
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
