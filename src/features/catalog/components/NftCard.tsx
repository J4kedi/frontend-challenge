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
        {/* Figma: on mobile a rounded gradient plate (175×200, art 168 px, 12 px from the top);
            on desktop a square plate (258×300, art 250 px, 31 px from the top). Padding in % keeps it at any width. */}
        <div className="relative overflow-hidden rounded-[20px] bg-surface bg-linear-to-br from-surface to-surface-raised px-[2%] pt-[7%] pb-[11%] md:rounded-none md:bg-none md:px-[1.5%] md:pt-[12%] md:pb-[7.4%]">
          {nft.rare && (
            <span className="absolute top-[9%] left-0 z-10 bg-primary px-2 py-1.5 text-caption font-medium text-ink uppercase md:hidden">Raro</span>
          )}
          <NftImage
            artwork={nft.artwork}
            alt={`Arte do NFT ${nft.name}`}
            sizes="(min-width: 1024px) 250px, (min-width: 768px) 30vw, 45vw"
            priority={priority}
            className="rounded-xl transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </div>
        <h3 id={`nft-${nft.id}`} className="mt-2 truncate px-2 text-body text-foreground md:mt-3 md:px-0">
          {nft.name}
        </h3>
        <p id={`nft-${nft.id}-price`} className="flex flex-wrap items-baseline gap-x-2 px-2 text-body-lg font-bold text-accent md:mt-1 md:px-0">
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
      <Skeleton className="aspect-[175/200] w-full rounded-[20px] md:aspect-[258/300] md:rounded-none" />
      <Skeleton className="mt-4 h-5 w-3/4" />
      <Skeleton className="mt-1 h-5 w-1/3" />
    </div>
  )
}
