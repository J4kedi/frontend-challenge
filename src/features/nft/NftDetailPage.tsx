import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link, useNavigate, useRouter } from '@tanstack/react-router'
import { MailIcon, ZoomInIcon } from 'lucide-react'
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'
import { useState } from 'react'
import { toast } from 'sonner'
import { ErrorState, NotFoundPage } from '@/components/feedback/StatusPage'
import { ArrowLeftIcon, CartIcon, StarIcon } from '@/components/icons'
import { BrandIcon } from '@/components/icons/BrandIcon'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NETWORK_LABEL, type Edition, type NftDetail } from '@/contracts/nft'
import { useAddToCart } from '@/features/cart/queries'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/NftCard'
import { NftImage } from '@/features/catalog/components/NftImage'
import { nftDetailOptions, relatedOptions } from '@/features/catalog/queries'
import { FavoriteButton } from '@/features/favorites/FavoriteButton'
import { announce } from '@/shared/a11y/announcer'
import { isApiError } from '@/shared/api/errors'
import { DESKTOP_QUERY, useMediaQuery } from '@/shared/hooks/use-media-query'
import { cn } from '@/shared/lib/cn'
import { formatEth } from '@/shared/lib/money'

const route = getRouteApi('/nft/$nftId')

const editionKey = (edition: Edition) => edition.id.split(':')[1]!

/** Detalhes do NFT (Figma "Desktop / Detalhes do NFT" and "Mobile / Detalhes do NFT"). */
export function NftDetailPage() {
  const { nftId } = route.useParams()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const detail = useQuery(nftDetailOptions(nftId))

  if (detail.isPending) return <DetailSkeleton />
  if (detail.isError) {
    if (isApiError(detail.error, 'NOT_FOUND')) {
      return <NotFoundPage title="NFT não encontrado" message="Este NFT não existe ou foi removido do mercado." />
    }
    return (
      <div className="mx-auto max-w-page px-4 py-16 md:px-6 xl:px-0">
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} title="Não foi possível carregar este NFT" />
      </div>
    )
  }

  const nft = detail.data
  const edition =
    nft.editions.find((e) => editionKey(e) === search.edition) ??
    nft.editions.find((e) => e.id.endsWith(':1-50')) ??
    nft.editions[0]!

  return (
    <article className="mx-auto max-w-page pb-14 md:px-6 md:pt-8 md:pb-0 xl:px-0" aria-labelledby="nft-title">
      <title>{`${nft.name} — Kurio`}</title>
      <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/', hash: 'mercado' }, { label: nft.name }]} />

      <div className="grid md:mt-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-8 lg:grid-cols-[100px_444px_minmax(0,1fr)] lg:gap-7">
        <Gallery nft={nft} />

        {/* Mobile: the Figma "Details Sheet", rounded on top and over the bottom of the art. */}
        <div className="relative -mt-[30px] rounded-t-[31px] bg-surface px-6 pt-8 md:mt-0 md:rounded-none md:bg-transparent md:px-0 md:pt-0">
          <div className="flex items-start justify-between gap-4">
            <h1 id="nft-title" className="text-title font-bold text-foreground md:text-heading-lg">
              {nft.name}
            </h1>
            <Rating nft={nft} compact />
          </div>
          <div className="mt-3 hidden items-center justify-between gap-4 border-b border-border pb-3 md:flex">
            <Price nft={nft} edition={edition} />
            <Rating nft={nft} />
          </div>

          <h2 className="mt-4 hidden text-body-lg font-bold md:block">Sobre este NFT:</h2>
          <p className="mt-3 text-body-sm leading-6 text-muted-foreground md:mt-2">{nft.description}</p>

          <EditionPicker
            nft={nft}
            selected={edition}
            onSelect={(next) => void navigate({ search: { edition: editionKey(next) }, replace: true, resetScroll: false })}
          />

          <PurchasePanel key={edition.id} nft={nft} edition={edition} />

          <dl className="mt-3 space-y-3 text-body text-secondary md:mt-6 md:text-body-sm md:text-muted-foreground">
            <div>
              <dt className="inline">ID do token: </dt>
              <dd className="inline">{nft.tokenId}</dd>
            </div>
            <div>
              <dt className="inline">Coleção: </dt>
              <dd className="inline">{nft.collectionName}</dd>
            </div>
            <div>
              <dt className="inline">Atributos: </dt>
              <dd className="inline">{nft.attributes.join(', ')}</dd>
            </div>
          </dl>
          <ShareLinks nft={nft} />
        </div>
      </div>

      <DetailTabs nft={nft} />
      <RelatedNfts nftId={nft.id} />
    </article>
  )
}

function Gallery({ nft }: { nft: NftDetail }) {
  const [active, setActive] = useState(0)
  const router = useRouter()
  const artwork = nft.gallery[active] ?? nft.artwork

  return (
    <>
      <div className="hidden flex-col gap-4 lg:flex" role="group" aria-label="Galeria">
        {nft.gallery.map((item, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setActive(index)}
            aria-label={`Ver imagem ${index + 1} de ${nft.gallery.length}`}
            aria-pressed={active === index}
            className={cn('overflow-hidden rounded-lg border-2', active === index ? 'border-primary' : 'border-transparent')}
          >
            <NftImage artwork={item} alt="" sizes="100px" />
          </button>
        ))}
      </div>

      {/* Mobile (Figma "Hero"): back and favorite above an inset art, with the gallery dots over it. */}
      <div className="relative self-start bg-linear-to-b from-surface to-surface-raised px-7 pt-6 md:rounded-xl md:bg-surface md:bg-none md:p-5">
        <div className="mb-2 flex items-center justify-between md:hidden">
          <button
            type="button"
            onClick={() => (router.history.canGoBack() ? router.history.back() : void router.navigate({ to: '/', hash: 'mercado' }))}
            aria-label="Voltar"
            className="grid size-8.75 place-items-center rounded-full border border-border bg-surface-raised text-muted-foreground hover:text-accent"
          >
            <ArrowLeftIcon className="size-5" />
          </button>
          <FavoriteButton nftId={nft.id} name={nft.name} className="size-8.75 border border-border bg-surface-raised text-accent backdrop-blur-none" />
        </div>
        <div className="relative">
          <NftImage
            artwork={artwork}
            alt={`Arte do NFT ${nft.name}`}
            sizes="(min-width: 1024px) 404px, (min-width: 768px) 45vw, calc(100vw - 56px)"
            priority
            className="rounded-3xl md:rounded-xl"
          />
          {nft.gallery.length > 1 && (
            <div className="absolute bottom-[50px] left-1/2 flex -translate-x-1/2 md:hidden" role="group" aria-label="Galeria">
              {nft.gallery.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={`Ver imagem ${index + 1} de ${nft.gallery.length}`}
                  aria-pressed={active === index}
                  className="group grid h-6 min-w-6 place-items-center"
                >
                  <span
                    aria-hidden="true"
                    className={cn('h-[7px] rounded-full bg-primary transition-all', active === index ? 'w-7' : 'w-[7px] opacity-70 group-hover:opacity-100')}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label="Ampliar imagem"
              className="absolute top-8 right-8 hidden size-9 place-items-center rounded-full bg-surface/80 text-foreground backdrop-blur hover:text-accent md:grid"
            >
              <ZoomInIcon className="size-5" aria-hidden="true" />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl border-border-soft bg-surface p-4">
            <DialogTitle className="text-title-sm">{nft.name}</DialogTitle>
            <DialogDescription className="sr-only">Imagem ampliada da arte do NFT</DialogDescription>
            <NftImage artwork={artwork} alt={`Arte do NFT ${nft.name} ampliada`} sizes="720px" className="rounded-lg" />
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}

function Price({ nft, edition }: { nft: NftDetail; edition: Edition }) {
  return (
    <p className="flex items-baseline gap-3 text-title-lg font-bold text-accent" data-testid="detail-price">
      <span>
        <span className="sr-only">Preço da edição {edition.label}: </span>
        {formatEth(edition.priceEth)}
      </span>
      {nft.previousPriceEth && edition.id.endsWith(':1-50') && (
        <s className="text-body-lg font-normal text-muted-foreground">
          <span className="sr-only">Preço anterior: </span>
          {formatEth(nft.previousPriceEth)}
        </s>
      )}
    </p>
  )
}

function Rating({ nft, compact = false }: { nft: NftDetail; compact?: boolean }) {
  const label = `Nota ${nft.rating.average.toFixed(1).replace('.', ',')} de 5, ${nft.rating.count} avaliações de colecionadores`
  if (compact) {
    return (
      <p className="flex shrink-0 items-center gap-1 rounded-full border border-primary px-2 py-1 text-body-sm text-foreground md:hidden">
        <StarIcon className="size-3.5 text-primary" />
        <span aria-hidden="true">
          <span className="font-medium">{nft.rating.average.toFixed(1)}</span> <span className="text-muted-foreground">({nft.rating.count})</span>
        </span>
        <span className="sr-only">{label}</span>
      </p>
    )
  }
  return (
    <p className="flex items-center gap-2 text-body-sm text-foreground">
      <span className="flex gap-0.5 text-primary" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <StarIcon key={i} className={cn('size-4', i >= Math.round(nft.rating.average) && 'opacity-30')} />
        ))}
      </span>
      <span aria-hidden="true">{nft.rating.count} avaliações de colecionadores</span>
      <span className="sr-only">{label}</span>
    </p>
  )
}

function EditionPicker({ nft, selected, onSelect }: { nft: NftDetail; selected: Edition; onSelect: (edition: Edition) => void }) {
  return (
    <div className="mt-4">
      <p id="edition-label" className="text-body font-bold text-foreground md:text-body-lg">
        Edição:
      </p>
      <RadioGroupPrimitive.Root
        aria-labelledby="edition-label"
        value={selected.id}
        onValueChange={(id) => {
          const next = nft.editions.find((e) => e.id === id)
          if (next) onSelect(next)
        }}
        className="mt-2 flex flex-wrap gap-2"
      >
        {nft.editions.map((edition) => {
          const soldOut = edition.available === 0
          return (
            <RadioGroupPrimitive.Item
              key={edition.id}
              value={edition.id}
              aria-label={`Edição ${edition.label}${soldOut ? ', esgotada' : `, ${formatEth(edition.priceEth)}`}`}
              className={cn(
                'rounded-full border px-3 py-1 text-body-sm uppercase transition-colors',
                'data-[state=checked]:border-primary data-[state=checked]:font-bold data-[state=checked]:text-accent',
                'data-[state=unchecked]:border-border data-[state=unchecked]:text-muted-foreground hover:border-primary',
                'md:data-[state=unchecked]:border-border-soft md:data-[state=unchecked]:text-foreground',
                soldOut && 'line-through decoration-coral',
              )}
            >
              {edition.label}
            </RadioGroupPrimitive.Item>
          )
        })}
      </RadioGroupPrimitive.Root>
    </div>
  )
}

function PurchasePanel({ nft, edition }: { nft: NftDetail; edition: Edition }) {
  const desktop = useMediaQuery(DESKTOP_QUERY)
  const [quantity, setQuantity] = useState(1)
  const add = useAddToCart()
  const navigate = useNavigate()
  const soldOut = edition.available === 0
  const max = Math.max(1, Math.min(edition.maxPerOrder, edition.available))
  const limit = soldOut
    ? 'Esta edição esgotou. Escolha outra edição.'
    : quantity >= max
      ? edition.available < edition.maxPerOrder
        ? `Só ${edition.available === 1 ? 'resta 1' : `restam ${edition.available}`} nesta edição.`
        : `Máximo de ${edition.maxPerOrder} por pedido nesta edição.`
      : null

  async function addToCart(goToCart: boolean) {
    try {
      await add.mutateAsync({ nftId: nft.id, editionId: edition.id, quantity })
      announce(`${quantity} × ${nft.name} (edição ${edition.label}) adicionado ao carrinho.`)
      if (goToCart) void navigate({ to: '/cart' })
      else toast.success(`${nft.name} adicionado ao carrinho`, { action: { label: 'Ver carrinho', onClick: () => void navigate({ to: '/cart' }) } })
    } catch {
      // The message is rendered below from add.error.
    }
  }

  const error = add.error && isApiError(add.error) ? add.error.message : add.error ? 'Não foi possível adicionar ao carrinho.' : null
  const stepper = (
    <QuantityStepper
      size={desktop ? 'md' : 'sm'}
      value={quantity}
      max={max}
      onChange={setQuantity}
      label={`Quantidade de ${nft.name}`}
      disabled={soldOut}
    />
  )
  const messages = (
    <>
      {limit && (
        <p className="mt-2 text-caption text-amber" role="status">
          {limit}
        </p>
      )}
      {error && (
        <p className="mt-2 text-body-sm text-danger-text" role="alert">
          {error}
        </p>
      )}
    </>
  )

  if (!desktop) {
    // Figma "Buy Bar": fixed at the bottom of the mobile detail, rounded on top.
    return (
      <div data-buy-bar className="fixed inset-x-0 bottom-0 z-40 rounded-t-[40px] bg-surface px-6 pt-5 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-overlay">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-body font-medium text-muted-foreground">Qtd.</span>
            {stepper}
          </div>
          <p className="text-title font-bold text-accent">{formatEth(edition.priceEth)}</p>
        </div>
        {messages}
        <div className="mt-5 flex gap-3">
          <Button
            size="pill"
            className="h-15 w-49 bg-linear-to-br from-primary to-primary/80 text-body-lg font-bold"
            onClick={() => void addToCart(true)}
            disabled={soldOut || add.isPending}
            aria-busy={add.isPending}
          >
            Comprar NFT
          </Button>
          <Button
            size="icon-lg"
            variant="secondary"
            className="size-15 rounded-full border border-border"
            aria-label="Adicionar ao carrinho sem sair da página"
            onClick={() => void addToCart(false)}
            disabled={soldOut || add.isPending}
          >
            <CartIcon className="size-5" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {stepper}
        <div className="flex items-center gap-2">
          <Button onClick={() => void addToCart(true)} disabled={soldOut || add.isPending} aria-busy={add.isPending} className="h-11 w-32 uppercase">
            {add.isPending ? 'Adicionando…' : 'Comprar'}
          </Button>
          <FavoriteButton nftId={nft.id} name={nft.name} variant="outline" className="h-11" />
        </div>
      </div>
      {messages}
    </div>
  )
}

function ShareLinks({ nft }: { nft: NftDetail }) {
  const url = typeof window === 'undefined' ? '' : window.location.href
  const text = `${nft.name} na Kurio`
  const link = 'grid size-7 place-items-center text-foreground hover:text-accent'
  return (
    <div className="mt-4 hidden items-center gap-3 md:flex">
      <span className="text-body-sm font-bold text-foreground">Compartilhar este NFT:</span>
      <a className={link} href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" aria-label="Compartilhar no LinkedIn (abre em nova aba)">
        <BrandIcon brand="linkedin" className="size-4" />
      </a>
      <a className={link} href={`mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`} aria-label="Compartilhar por e-mail">
        <MailIcon className="size-4" aria-hidden="true" />
      </a>
      <a className={link} href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" aria-label="Compartilhar no Twitter (abre em nova aba)">
        <BrandIcon brand="twitter" className="size-4" />
      </a>
    </div>
  )
}

const TAB_TRIGGER =
  'flex-none rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 pb-2 text-body-lg font-medium text-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-accent data-[state=active]:shadow-none'

function DetailTabs({ nft }: { nft: NftDetail }) {
  const standard = nft.network === 'solana' ? 'SPL' : 'ERC-721'
  const contract = `${nft.contractAddress.slice(0, 6)}...${nft.contractAddress.slice(-4)}`
  return (
    <Tabs defaultValue="details" className="mt-16 px-6 md:px-0">
      <TabsList className="h-auto w-full max-w-full justify-start gap-6 overflow-x-auto rounded-none border-b border-border bg-transparent p-0 md:gap-8">
        <TabsTrigger value="details" className={TAB_TRIGGER}>
          Detalhes do NFT
        </TabsTrigger>
        <TabsTrigger value="reviews" className={TAB_TRIGGER}>
          Avaliações de colecionadores ({nft.rating.count})
        </TabsTrigger>
      </TabsList>
      <TabsContent value="details" className="mt-4 space-y-4 text-body-sm leading-6 text-muted-foreground">
        <p>
          {nft.name} é uma obra digital finalizada à mão da coleção {nft.collectionName}. Cada atributo fica armazenado nos metadados do token e verificado na{' '}
          {NETWORK_LABEL[nft.network]}.
        </p>
        <p>
          A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência na rede. O criador recebe
          5% de direitos autorais nas vendas secundárias.
        </p>
        <dl className="space-y-3">
          <div>
            <dt className="font-bold text-foreground">Rede:</dt>
            <dd>Cunhado na {NETWORK_LABEL[nft.network]} com procedência imutável e metadados armazenados no IPFS.</dd>
          </div>
          <div>
            <dt className="font-bold text-foreground">Contrato:</dt>
            <dd>
              {contract} • Contrato inteligente {standard} verificado.
            </dd>
          </div>
          <div>
            <dt className="font-bold text-foreground">Direitos autorais:</dt>
            <dd>Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.</dd>
          </div>
        </dl>
      </TabsContent>
      <TabsContent value="reviews" className="mt-4 text-body-sm text-muted-foreground">
        <p>
          Nota média {nft.rating.average.toFixed(1).replace('.', ',')} de 5 em {nft.rating.count} avaliações. O texto das avaliações não faz parte desta
          demonstração.
        </p>
      </TabsContent>
    </Tabs>
  )
}

function RelatedNfts({ nftId }: { nftId: string }) {
  const { data, isPending } = useQuery(relatedOptions(nftId))
  return (
    <section aria-labelledby="related-title" className="mt-16 px-6 md:px-0">
      <h2 id="related-title" className="border-b border-border pb-2 text-title-sm font-bold text-accent">
        Mais desta coleção
      </h2>
      <ul className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-5">
        {isPending
          ? Array.from({ length: 5 }, (_, i) => (
              <li key={i}>
                <NftCardSkeleton />
              </li>
            ))
          : data?.items.map((nft) => (
              <li key={nft.id}>
                <NftCard nft={nft} />
              </li>
            ))}
      </ul>
      <p className="mt-6 text-center md:hidden">
        <Link to="/" hash="mercado" className="text-body-sm font-bold text-accent">
          Ver todo o mercado
        </Link>
      </p>
    </section>
  )
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-page md:px-6 md:pt-8 xl:px-0" aria-busy="true" data-testid="detail-skeleton">
      <p role="status" className="sr-only">
        Carregando NFT…
      </p>
      <div className="grid gap-8 md:mt-10 md:grid-cols-2 lg:grid-cols-[100px_444px_minmax(0,1fr)] lg:gap-7">
        <div className="hidden flex-col gap-4 lg:flex">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
        <div className="bg-linear-to-b from-surface to-surface-raised px-7 pt-6 md:bg-none md:p-0">
          <div className="mb-2 h-8.75 md:hidden" />
          <Skeleton className="aspect-square w-full rounded-3xl md:rounded-xl" />
        </div>
        <div className="space-y-4 px-6 md:px-0">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-11 w-3/4" />
        </div>
      </div>
      <NftCardSkeleton />
    </div>
  )
}
