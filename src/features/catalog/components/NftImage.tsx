import type { Artwork } from '@/contracts/nft'
import { cn } from '@/shared/lib/cn'

const WIDTHS = [360, 720, 1080] as const
const srcSet = (artwork: Artwork, format: 'avif' | 'webp') =>
  WIDTHS.map((w) => `/images/nfts/${artwork}-${w}.${format} ${w}w`).join(', ')

/**
 * Responsive artwork (AVIF → WebP fallback) generated from the Figma originals.
 * Square, with explicit size so the layout never shifts while it loads.
 */
export function NftImage({
  artwork,
  alt,
  sizes,
  priority = false,
  className,
}: {
  artwork: Artwork
  alt: string
  sizes: string
  priority?: boolean
  className?: string
}) {
  return (
    <picture>
      <source type="image/avif" srcSet={srcSet(artwork, 'avif')} sizes={sizes} />
      <img
        src={`/images/nfts/${artwork}-720.webp`}
        srcSet={srcSet(artwork, 'webp')}
        sizes={sizes}
        alt={alt}
        width={720}
        height={720}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        className={cn('aspect-square w-full object-cover', className)}
      />
    </picture>
  )
}
