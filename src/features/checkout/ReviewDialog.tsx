import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { FormError } from '@/components/form/FormField'
import { WALLET_PROVIDER_LABEL, type Wallet, type WalletProvider } from '@/contracts/account'
import type { Quote } from '@/contracts/commerce'
import { NETWORK_LABEL, type Network } from '@/contracts/nft'
import { QuoteNotice } from '@/features/cart/components/QuoteNotice'
import { QuoteTotals } from '@/features/cart/components/QuoteSummary'
import { OrderItems } from './CheckoutPage'

/**
 * Review step (not drawn in the Figma; follows the confirmation modal). Shows
 * the freshly revalidated quote; if anything changed, the collector has to
 * accept it before "Confirmar e pagar" is enabled again.
 */
export function ReviewDialog({
  open,
  onOpenChange,
  quote,
  isRefreshing,
  wallet,
  network,
  provider,
  buyerName,
  submitting,
  error,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  quote: Quote | undefined
  isRefreshing: boolean
  wallet: Wallet
  network: Network
  provider: WalletProvider
  buyerName: string
  submitting: boolean
  error: string | null
  onConfirm: (quote: Quote) => void
}) {
  const ready = Boolean(quote?.purchasable) && !isRefreshing
  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="max-h-[90dvh] max-w-[578px] overflow-y-auto rounded-lg border-0 border-b-10 border-b-primary bg-surface p-6 md:p-10">
        <DialogTitle className="text-center text-title font-bold text-accent">Revise sua compra</DialogTitle>
        <DialogDescription className="text-center text-body-sm text-muted-foreground">
          Confira itens, valores e carteira. O pedido só é enviado quando você confirmar.
        </DialogDescription>
        <dl className="grid grid-cols-2 gap-3 border-y border-primary py-4 text-body-sm">
          <div>
            <dt className="font-bold">Colecionador</dt>
            <dd className="text-muted-foreground">{buyerName}</dd>
          </div>
          <div>
            <dt className="font-bold">Carteira</dt>
            <dd className="text-muted-foreground">
              {WALLET_PROVIDER_LABEL[provider]} · {wallet.nickname}
            </dd>
          </div>
          <div>
            <dt className="font-bold">Rede</dt>
            <dd className="text-muted-foreground">{NETWORK_LABEL[network]}</dd>
          </div>
          <div>
            <dt className="font-bold">Endereço</dt>
            <dd className="truncate text-muted-foreground">{wallet.address}</dd>
          </div>
        </dl>
        <OrderItems quote={quote} />
        <QuoteNotice quote={quote} />
        <QuoteTotals quote={quote} />
        <FormError message={error} />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Voltar e editar
          </Button>
          <Button
            type="button"
            onClick={() => quote && onConfirm(quote)}
            disabled={!ready || submitting}
            aria-busy={submitting}
            data-testid="confirm-purchase"
          >
            {submitting ? 'Enviando pedido…' : isRefreshing ? 'Atualizando valores…' : 'Confirmar e pagar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
