import { Link } from '@tanstack/react-router'
import type { NftSummary } from '@/contracts/nft'
import { FavoriteButton } from '@/features/favorites/FavoriteButton'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEth } from '@/shared/lib/money'
import { NftImage } from './NftImage'

/** Product card of the catalog grid (Figma: "Product Grid" item). */
export function NftCard({ nft, priority = false }: { nft: NftSummary; priority?: boolean }) {
  const soldOut = nft.available === 0
  return (
    <article className="group relative" aria-labelledby={`nft-${nft.id}`} data-testid="nft-card">
      <Link
        to="/nft/$nftId"
        params={{ nftId: nft.id }}
        className="block rounded-xl focus-visible:outline-offset-4"
        aria-describedby={`nft-${nft.id}-price`}
      >
        <div className="overflow-hidden rounded-xl bg-surface p-1 shadow-card">
          <NftImage
            artwork={nft.artwork}
            alt={`Arte do NFT ${nft.name}`}
            sizes="(min-width: 1024px) 250px, (min-width: 768px) 30vw, 45vw"
            priority={priority}
            className="rounded-xl transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </div>
        <h3 id={`nft-${nft.id}`} className="mt-4 truncate text-body text-foreground">
          {nft.name}
        </h3>
        <p id={`nft-${nft.id}-price`} className="mt-1 flex flex-wrap items-baseline gap-x-2 text-body-lg font-bold text-accent">
          <span>
            <span className="sr-only">Preço: </span>
            {formatEth(nft.priceEth)}
          </span>
          {nft.previousPriceEth && (
            <s className="font-normal text-muted-foreground">
              <span className="sr-only">Preço anterior: </span>
              {formatEth(nft.previousPriceEth)}
            </s>
          )}
          {soldOut && <span className="text-caption font-bold text-coral uppercase">Esgotado</span>}
        </p>
      </Link>
      <FavoriteButton nftId={nft.id} name={nft.name} className="absolute top-3 right-3 md:hidden" />
    </article>
  )
}

export function NftCardSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <Skeleton className="mt-4 h-5 w-3/4" />
      <Skeleton className="mt-1 h-5 w-1/3" />
    </div>
  )
}
