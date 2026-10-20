import { Button } from '@/components/ui/button'
import type { Quote } from '@/contracts/commerce'
import { announce } from '@/shared/a11y/announcer'
import { useAcknowledgePrices } from '../queries'

/**
 * Shown when the quote no longer matches what the collector saw: a price moved
 * (realtime or between visits) or an edition sold out. Prices must be accepted
 * explicitly before checkout; stock problems must be fixed in the cart.
 */
export function QuoteNotice({ quote }: { quote: Quote | undefined }) {
  const acknowledge = useAcknowledgePrices()
  if (!quote) return null
  const changed = quote.lines.filter((l) => l.status === 'price-changed')
  const blocked = quote.lines.filter((l) => l.status === 'unavailable' || l.status === 'insufficient')
  if (!changed.length && !blocked.length) return null

  return (
    <div role="status" className="space-y-3 rounded-sm border border-amber/60 bg-amber/10 p-4 text-body-sm text-foreground" data-testid="quote-notice">
      {changed.length > 0 && (
        <>
          <p>
            {changed.length === 1 ? `O preço de ${changed[0]!.name} mudou` : `Os preços de ${changed.length} itens mudaram`} enquanto você navegava. O resumo já
            mostra os valores novos.
          </p>
          <Button
            size="sm"
            onClick={() => acknowledge.mutate(undefined, { onSuccess: () => announce('Novos preços aceitos. Você pode continuar.') })}
            disabled={acknowledge.isPending}
            aria-busy={acknowledge.isPending}
          >
            Aceitar novos preços
          </Button>
        </>
      )}
      {blocked.length > 0 && (
        <p>Alguns itens não estão mais disponíveis na quantidade escolhida. Ajuste as quantidades ou remova os itens para continuar.</p>
      )}
    </div>
  )
}
