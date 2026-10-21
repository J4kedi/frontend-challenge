import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { ErrorState } from '@/components/feedback/StatusPage'
import { ArrowLeftIcon, DeleteIcon } from '@/components/icons'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { Button } from '@/components/ui/button'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { Skeleton } from '@/components/ui/skeleton'
import type { CartLine, Quote, QuoteLine } from '@/contracts/commerce'
import type { Network } from '@/contracts/nft'
import { walletsOptions } from '@/features/account/queries'
import { useSession } from '@/features/auth/session'
import { promptVisitor } from '@/features/auth/login-prompt'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/NftCard'
import { NftImage } from '@/features/catalog/components/NftImage'
import { nftListOptions } from '@/features/catalog/queries'
import { announce } from '@/shared/a11y/announcer'
import { isApiError } from '@/shared/api/errors'
import { cn } from '@/shared/lib/cn'
import { formatEth, multiplyEth } from '@/shared/lib/money'
import { CouponForm, QuoteTotals } from './components/QuoteSummary'
import { QuoteNotice } from './components/QuoteNotice'
import { useCart, useQuote, useRemoveCartLine, useUpdateCartLine } from './queries'

/** Carrinho de NFTs (Figma "Desktop / Carrinho de NFTs" and "Mobile / Carrinho de NFTs"). */
export function CartPage() {
  const cart = useCart()
  const network = useCheckoutNetwork()
  const quote = useQuote(network ?? 'ethereum', Boolean(cart.data?.lines.length) && network !== null)
  const router = useRouter()
  const lines = cart.data?.lines ?? []

  return (
    <div className="mx-auto max-w-page px-4 pt-6 md:px-6 md:pt-8 xl:px-0">
      <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/', hash: 'mercado' }, { label: 'Carrinho' }]} />
      <div className="flex items-center gap-4 md:hidden">
        <button type="button" onClick={() => (router.history.canGoBack() ? router.history.back() : void router.navigate({ to: '/', hash: 'mercado' }))} aria-label="Voltar" className="grid size-9 place-items-center rounded-full bg-surface-raised">
          <ArrowLeftIcon className="size-5" />
        </button>
        <h1 className="text-title font-bold">Carrinho de NFTs</h1>
      </div>
      <h1 className="sr-only max-md:hidden">Carrinho de NFTs</h1>

      {cart.isPending ? (
        <CartSkeleton />
      ) : cart.isError ? (
        <div className="mt-8">
          <ErrorState error={cart.error} onRetry={() => void cart.refetch()} title="Não foi possível carregar o carrinho" />
        </div>
      ) : lines.length === 0 ? (
        <EmptyCart />
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,782px)_332px] lg:justify-between">
          <section aria-label="Itens do carrinho" className="space-y-4">
            <QuoteNotice quote={quote.data} />
            <CartTable lines={lines} quote={quote.data} />
            <CartCards lines={lines} quote={quote.data} />
          </section>
          {/* Mobile: the summary is the Figma bottom sheet, card-colored and rounded on top. */}
          <aside aria-labelledby="summary-title" className="space-y-6 max-md:-mx-4 max-md:rounded-t-[40px] max-md:bg-surface max-md:px-6 max-md:pt-6 max-md:pb-8 lg:pt-1">
            <h2 id="summary-title" className="hidden border-b border-border pb-3 text-title-sm font-bold md:block">
              Resumo da carteira
            </h2>
            <div className="hidden md:block">
              <CouponForm quote={quote.data} />
            </div>
            <div className="md:hidden">
              <CouponForm quote={quote.data} variant="pill" />
            </div>
            {quote.isError ? (
              <ErrorState error={quote.error} onRetry={() => void quote.refetch()} title="Não foi possível calcular o total" />
            ) : (
              <QuoteTotals quote={quote.data} />
            )}
            <CheckoutButton quote={quote.data} />
            <p className="text-center">
              <Link to="/" hash="mercado" className="text-body-lg text-accent hover:underline">
                Continuar explorando
              </Link>
            </p>
          </aside>
        </div>
      )}
      <RelatedProducts />
    </div>
  )
}

/**
 * The network the payment page starts on (the primary wallet's), so the fee and
 * total here match the ones there. Visitors see Ethereum; null while loading.
 */
function useCheckoutNetwork(): Network | null {
  const { user } = useSession()
  const wallets = useQuery({ ...walletsOptions(user?.id ?? 'anonymous'), enabled: Boolean(user) })
  if (!user) return 'ethereum'
  if (wallets.isError) return 'ethereum'
  return wallets.data ? (wallets.data.items.find((w) => w.slot === 'primary')?.network ?? 'ethereum') : null
}

function CheckoutButton({ quote }: { quote: Quote | undefined }) {
  const navigate = useNavigate()
  const ready = quote?.purchasable === true
  const reason = !quote ? 'Calculando o total…' : !ready ? 'Resolva os avisos do carrinho para continuar.' : null
  // Visitors sign in over the cart; the cart moves into the account (see signIn) before checkout.
  const signInFirst = promptVisitor({
    reason: 'Entre para finalizar a compra. Os itens do carrinho vão junto para a sua conta.',
    onSignedIn: () => void navigate({ to: '/checkout' }),
  })
  return (
    <div>
      {ready ? (
        <Button asChild size="lg" className="h-12 w-full max-md:h-15 max-md:rounded-full max-md:bg-linear-to-br max-md:from-primary max-md:to-primary/80">
          <Link to="/checkout" onClick={signInFirst}>
            Conectar e finalizar
          </Link>
        </Button>
      ) : (
        <Button size="lg" className="h-12 w-full max-md:h-15 max-md:rounded-full" disabled aria-describedby="checkout-blocked">
          Conectar e finalizar
        </Button>
      )}
      {reason && (
        <p id="checkout-blocked" className="mt-2 text-center text-caption text-muted-foreground">
          {reason}
        </p>
      )}
    </div>
  )
}

function useLineActions(line: CartLine) {
  const update = useUpdateCartLine()
  const remove = useRemoveCartLine()
  const onError = (error: unknown) => toast.error(isApiError(error) ? error.message : 'Não foi possível atualizar o carrinho.')
  return {
    busy: update.isPending || remove.isPending,
    setQuantity: (quantity: number) =>
      update.mutate(
        { lineId: line.id, quantity },
        { onSuccess: () => announce(`Quantidade de ${line.name} alterada para ${quantity}.`), onError },
      ),
    remove: () =>
      remove.mutate(line.id, { onSuccess: () => announce(`${line.name} removido do carrinho.`), onError }),
  }
}

function LineStatus({ status }: { status: QuoteLine | undefined }) {
  if (!status || status.status === 'ok') return null
  const text =
    status.status === 'price-changed'
      ? `Preço atualizado (antes ${formatEth(status.previousUnitPriceEth ?? status.unitPriceEth)})`
      : status.status === 'unavailable'
        ? 'Edição esgotada'
        : `Só ${status.available === 1 ? 'resta 1' : `restam ${status.available}`}`
  return (
    <span className={cn('mt-1 inline-block text-caption font-bold', status.status === 'price-changed' ? 'text-amber' : 'text-coral')} data-testid="line-status">
      {text}
    </span>
  )
}

const maxFor = (line: CartLine) => Math.max(1, Math.min(line.maxPerOrder, Math.max(line.available, line.quantity)))

function CartTable({ lines, quote }: { lines: CartLine[]; quote: Quote | undefined }) {
  return (
    <table className="hidden w-full table-fixed border-separate border-spacing-y-3 text-left md:table">
      {/* Column widths of the Figma table (311, 138, 137 and 140 of 782 px), as proportions. */}
      <colgroup>
        <col className="w-[39.8%]" />
        <col className="w-[17.6%]" />
        <col className="w-[17.5%]" />
        <col className="w-[17.9%]" />
        <col />
      </colgroup>
      <thead>
        <tr className="text-body-lg font-bold text-foreground">
          <th scope="col" className="border-b border-border pb-3">
            NFTs
          </th>
          <th scope="col" className="border-b border-border pb-3">
            Preço
          </th>
          <th scope="col" className="border-b border-border pb-3">
            Edições
          </th>
          <th scope="col" className="border-b border-border pb-3">
            Total
          </th>
          <th scope="col" className="border-b border-border pb-3">
            <span className="sr-only">Ações</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line) => (
          <CartRow key={line.id} line={line} status={quote?.lines.find((l) => l.lineId === line.id)} />
        ))}
      </tbody>
    </table>
  )
}

function CartRow({ line, status }: { line: CartLine; status: QuoteLine | undefined }) {
  const actions = useLineActions(line)
  return (
    <tr className="bg-surface" data-testid="cart-line">
      <td className="rounded-l-sm py-0 pr-4">
        <div className="flex items-center gap-4">
          <div className="w-[70px] shrink-0 overflow-hidden rounded-sm">
            <NftImage artwork={line.artwork} alt="" sizes="70px" />
          </div>
          <div>
            <p className="text-body-lg font-bold">{line.name}</p>
            <p className="text-body-sm text-muted-foreground">
              ID do token: {line.tokenId} · Edição {line.editionLabel}
            </p>
            <LineStatus status={status} />
          </div>
        </div>
      </td>
      <td className="text-body-lg font-bold text-muted-foreground">{formatEth(line.unitPriceEth)}</td>
      <td>
        <QuantityStepper size="sm" value={line.quantity} max={maxFor(line)} onChange={actions.setQuantity} disabled={actions.busy} label={`Quantidade de ${line.name}`} />
      </td>
      <td className="text-body-lg font-bold text-accent">{formatEth(multiplyEth(line.unitPriceEth, line.quantity))}</td>
      <td className="rounded-r-sm pr-4 text-right">
        <button
          type="button"
          onClick={actions.remove}
          disabled={actions.busy}
          aria-label={`Remover ${line.name} do carrinho`}
          className="grid size-9 place-items-center rounded-sm text-secondary hover:text-coral"
        >
          <DeleteIcon className="size-6" />
        </button>
      </td>
    </tr>
  )
}

function CartCards({ lines, quote }: { lines: CartLine[]; quote: Quote | undefined }) {
  return (
    <ul className="space-y-3 md:hidden">
      {lines.map((line) => (
        <CartCard key={line.id} line={line} status={quote?.lines.find((l) => l.lineId === line.id)} />
      ))}
    </ul>
  )
}

function CartCard({ line, status }: { line: CartLine; status: QuoteLine | undefined }) {
  const actions = useLineActions(line)
  return (
    <li className="flex gap-3 overflow-hidden rounded-lg bg-surface pr-3" data-testid="cart-line">
      <div className="w-24 shrink-0">
        <NftImage artwork={line.artwork} alt="" sizes="96px" className="h-full" />
      </div>
      <div className="min-w-0 flex-1 py-3">
        <p className="text-body font-bold">{line.name}</p>
        <p className="text-caption text-muted-foreground">Edição: {line.editionLabel}</p>
        <LineStatus status={status} />
        <p className="mt-2 text-title-sm font-bold text-accent">{formatEth(multiplyEth(line.unitPriceEth, line.quantity))}</p>
      </div>
      <div className="flex flex-col items-end justify-between py-3">
        <button type="button" onClick={actions.remove} disabled={actions.busy} aria-label={`Remover ${line.name} do carrinho`} className="text-secondary">
          <DeleteIcon className="size-5" />
        </button>
        <QuantityStepper size="sm" value={line.quantity} max={maxFor(line)} onChange={actions.setQuantity} disabled={actions.busy} label={`Quantidade de ${line.name}`} />
      </div>
    </li>
  )
}

function EmptyCart() {
  return (
    <div className="mt-8 flex flex-col items-center gap-3 rounded-lg border border-border-soft bg-surface px-6 py-16 text-center" data-testid="cart-empty">
      <p className="text-title-sm font-bold">Seu carrinho está vazio</p>
      <p className="text-body-sm text-muted-foreground">Escolha uma edição na página de um NFT para adicioná-la aqui.</p>
      <Button asChild variant="outline">
        <Link to="/" hash="mercado">
          Explorar o mercado
        </Link>
      </Button>
    </div>
  )
}

function CartSkeleton() {
  return (
    <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,782px)_332px] lg:justify-between" aria-busy="true" data-testid="cart-skeleton">
      <p role="status" className="sr-only">
        Carregando carrinho…
      </p>
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[70px]" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-8" />
        ))}
      </div>
    </div>
  )
}

/** Figma "Related Products": five trending NFTs per page, three pages behind the dots. */
const SHOWCASE_PAGES = 3
const SHOWCASE_SIZE = 5

function RelatedProducts() {
  const [page, setPage] = useState(1)
  const { data, isPending } = useQuery(nftListOptions({ tab: 'trending', page, pageSize: SHOWCASE_SIZE }))
  return (
    <section aria-labelledby="cart-related" className="mt-20">
      <h2 id="cart-related" className="border-b border-border pb-2 text-title-sm font-bold text-accent">
        Colecionadores também viram
      </h2>
      <ul className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-5">
        {isPending
          ? Array.from({ length: SHOWCASE_SIZE }, (_, i) => (
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
      <div role="group" aria-label="Páginas da vitrine" className="mt-6 flex justify-center gap-1">
        {Array.from({ length: SHOWCASE_PAGES }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setPage(i + 1)}
            aria-label={`Mostrar a página ${i + 1} de ${SHOWCASE_PAGES} da vitrine`}
            aria-current={page === i + 1 ? 'true' : undefined}
            className="group grid size-6 place-items-center"
          >
            <span aria-hidden="true" className={cn('size-3 rounded-full border border-primary', page === i + 1 ? 'bg-primary' : 'group-hover:bg-primary/40')} />
          </button>
        ))}
      </div>
    </section>
  )
}
