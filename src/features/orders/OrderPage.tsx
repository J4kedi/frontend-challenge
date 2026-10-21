import { getRouteApi, Link, useNavigate } from '@tanstack/react-router'
import { LoaderCircleIcon } from 'lucide-react'
import { useState } from 'react'
import { ErrorState, NotFoundPage } from '@/components/feedback/StatusPage'
import { CloseIcon, DangerIcon, ThankYouIllustration } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { WALLET_PROVIDER_LABEL } from '@/contracts/account'
import type { Order } from '@/contracts/commerce'
import { NETWORK_LABEL } from '@/contracts/nft'
import { NftImage } from '@/features/catalog/components/NftImage'
import { isApiError } from '@/shared/api/errors'
import { DESKTOP_QUERY, useMediaQuery } from '@/shared/hooks/use-media-query'
import { formatEth } from '@/shared/lib/money'
import { useOrder } from './queries'

const route = getRouteApi('/_auth/orders/$orderId')

const EXPLORER_NAME = { ethereum: 'Etherscan', polygon: 'Polygonscan', solana: 'Solscan' } as const

/**
 * Order status and receipt. The confirmation only renders for an order the
 * simulation confirmed; pending orders wait for order.updated (with polling
 * as a fallback) and survive reloads; declined orders keep the cart intact.
 */
export function OrderPage() {
  const { orderId } = route.useParams()
  const order = useOrder(orderId)

  if (order.isPending) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16" aria-busy="true">
        <Skeleton className="h-80" />
      </div>
    )
  }
  if (order.isError) {
    if (isApiError(order.error, 'NOT_FOUND') || isApiError(order.error, 'FORBIDDEN')) {
      return <NotFoundPage title="Pedido não encontrado" message="Este pedido não existe ou pertence a outra conta." />
    }
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <ErrorState error={order.error} onRetry={() => void order.refetch()} />
      </div>
    )
  }

  const data = order.data
  if (data.status === 'pending') return <PendingOrder order={data} />
  if (data.status === 'declined') return <DeclinedOrder order={data} />
  return <Receipt order={data} />
}

function PendingOrder({ order }: { order: Order }) {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-6 py-20 text-center" aria-labelledby="order-title" data-testid="order-pending">
      <LoaderCircleIcon className="size-12 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
      <h1 id="order-title" className="mt-6 text-heading font-bold">
        Processando pagamento
      </h1>
      <p className="mt-3 text-body text-muted-foreground" role="status">
        A rede {NETWORK_LABEL[order.network]} está confirmando a transação de {formatEth(order.totalEth)}. Você pode recarregar esta página: o pedido
        continua o mesmo e nada é cobrado duas vezes.
      </p>
      <p className="mt-6 text-caption text-muted-foreground">Pedido {order.id}</p>
    </section>
  )
}

function DeclinedOrder({ order }: { order: Order }) {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-6 py-20 text-center" aria-labelledby="order-title" data-testid="order-declined">
      <DangerIcon className="size-12 text-coral" />
      <h1 id="order-title" className="mt-6 text-heading font-bold">
        Pagamento recusado
      </h1>
      <p className="mt-3 text-body text-muted-foreground" role="alert">
        {order.failureReason ?? 'A rede recusou o pagamento. Nenhum valor foi cobrado.'}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/cart">Voltar ao carrinho</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/checkout">Tentar novamente</Link>
        </Button>
      </div>
    </section>
  )
}

const shortHash = (hash: string) => `${hash.slice(0, 6)}…${hash.slice(-4)}`
const dateLabel = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)).replace('.', '')

function Receipt({ order }: { order: Order }) {
  const desktop = useMediaQuery(DESKTOP_QUERY)
  const navigate = useNavigate()
  const content = <ReceiptContent order={order} />

  if (!desktop) {
    return (
      <section className="mx-auto max-w-xl px-4 pt-6 pb-10" aria-labelledby="receipt-title" data-testid="order-confirmed">
        {content}
      </section>
    )
  }
  return (
    <div className="mx-auto max-w-page px-6 py-16 xl:px-0" data-testid="order-confirmed">
      <Dialog open onOpenChange={(open) => !open && void navigate({ to: '/' })}>
        <DialogContent showCloseButton={false} className="flex max-h-[92dvh] max-w-[578px] flex-col overflow-y-auto rounded-lg border-0 border-b-10 border-b-primary bg-surface p-0">
          <button
            type="button"
            onClick={() => void navigate({ to: '/' })}
            aria-label="Fechar e voltar ao início"
            className="absolute top-5 right-5 grid size-8 place-items-center text-primary hover:text-accent"
          >
            <CloseIcon className="size-4" />
          </button>
          {content}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ReceiptContent({ order }: { order: Order }) {
  const [explorerOpen, setExplorerOpen] = useState(false)
  const desktop = useMediaQuery(DESKTOP_QUERY)
  const explorer = EXPLORER_NAME[order.network]
  return (
    <div className="flex min-h-0 flex-col text-foreground">
      <header className="flex flex-col items-center gap-4 px-4 pt-8 pb-6 text-center sm:px-8">
        <ThankYouIllustration className="size-20 text-primary" />
        <DialogTitleOrHeading>Seus NFTs agora estão na sua carteira</DialogTitleOrHeading>
      </header>
      <dl className="grid grid-cols-2 gap-y-3 border-y border-primary px-4 py-4 sm:px-8 text-body-sm md:grid-cols-4 md:divide-x md:divide-primary">
        <div className="md:pr-4">
          <dt className="font-bold">ID da transação</dt>
          <dd className="text-muted-foreground" data-testid="receipt-tx">
            {order.transaction ? shortHash(order.transaction.hash) : '—'}
          </dd>
        </div>
        <div className="md:px-4">
          <dt>Data</dt>
          <dd className="text-muted-foreground">{dateLabel(order.updatedAt)}</dd>
        </div>
        <div className="md:px-4">
          <dt>Total</dt>
          <dd className="text-muted-foreground" data-testid="receipt-total">
            {formatEth(order.totalEth)}
          </dd>
        </div>
        <div className="md:pl-4">
          <dt className="font-bold">Carteira</dt>
          <dd className="text-muted-foreground">{WALLET_PROVIDER_LABEL[order.wallet.provider]}</dd>
        </div>
      </dl>
      <section className="flex min-h-0 flex-col px-4 py-6 sm:px-8" aria-labelledby="receipt-details">
        <h2 id="receipt-details" className="text-body-lg font-bold">
          Detalhes da transação
        </h2>
        {/* In the desktop modal the lines scroll, so the totals and the explorer link always fit the window. */}
        <div className="mt-3 min-h-16 overflow-y-auto" role="region" aria-label="NFTs do pedido" tabIndex={desktop ? 0 : undefined}>
          <table className="w-full text-left text-body-sm">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-border text-body-lg font-bold">
                <th scope="col" className="pb-2">
                  NFTs
                </th>
                <th scope="col" className="pb-2 text-center">
                  Edições
                </th>
                <th scope="col" className="pb-2 text-right">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line) => (
                <tr key={line.editionId}>
                  <td className="py-2">
                    <div className="flex items-center gap-3">
                      <div className="hidden w-16 shrink-0 overflow-hidden rounded-sm min-[360px]:block">
                        <NftImage artwork={line.artwork} alt="" sizes="64px" />
                      </div>
                      <div>
                        <p className="text-body-lg font-bold">{line.name}</p>
                        <p className="text-caption text-muted-foreground">
                          ID do token: {line.tokenId} · {line.editionLabel}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="text-center text-muted-foreground">(x {line.quantity})</td>
                  <td className="text-right text-title-sm font-bold text-accent">{formatEth(line.lineTotalEth)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="mt-4 ml-auto max-w-xs space-y-2 text-body-lg">
          {order.discountEth !== '0' && (
            <div className="flex justify-between">
              <dt>Desconto{order.couponCode ? ` (${order.couponCode})` : ''}</dt>
              <dd>(-) {formatEth(order.discountEth)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Taxa de rede</dt>
            <dd>{formatEth(order.networkFeeEth)}</dd>
          </div>
          <div className="flex justify-between font-bold">
            <dt>Total</dt>
            <dd className="text-accent">{formatEth(order.totalEth)}</dd>
          </div>
        </dl>
        <p className="mt-6 border-t border-border pt-4 text-center text-body-sm text-muted-foreground">
          Transação confirmada na {NETWORK_LABEL[order.network]}. A propriedade foi transferida para sua carteira conectada e registrada na rede.
        </p>
        <div className="mt-6 flex justify-center">
          <Button onClick={() => setExplorerOpen(true)}>Ver no {explorer}</Button>
        </div>
      </section>
      <Dialog open={explorerOpen} onOpenChange={setExplorerOpen}>
        <DialogContent className="max-w-md border-border-soft bg-surface-raised">
          <DialogTitle>Explorador simulado</DialogTitle>
          <DialogDescription className="text-body-sm text-muted-foreground">
            Esta transação existe só na simulação da demonstração, então o {explorer} real não a encontraria. Referência registrada:
          </DialogDescription>
          <p className="rounded-sm bg-surface p-3 font-mono text-caption break-all">{order.transaction?.hash}</p>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Inside the desktop modal the title must be the Dialog title; on mobile it is the page heading. */
function DialogTitleOrHeading({ children }: { children: string }) {
  const desktop = useMediaQuery(DESKTOP_QUERY)
  return desktop ? (
    <>
      <DialogTitle className="text-title-sm font-bold text-accent">{children}</DialogTitle>
      <DialogDescription className="sr-only">Recibo do pedido confirmado</DialogDescription>
    </>
  ) : (
    <h1 id="receipt-title" className="text-title-sm font-bold text-accent">
      {children}
    </h1>
  )
}
