import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Quote } from '@/contracts/commerce'
import { announce } from '@/shared/a11y/announcer'
import { isApiError } from '@/shared/api/errors'
import { cn } from '@/shared/lib/cn'
import { formatEth } from '@/shared/lib/money'
import { useApplyCoupon, useRemoveCoupon } from '../queries'

/** Subtotal, discount, network fee and total — always the API quote, never computed in the UI. */
export function QuoteTotals({ quote, className }: { quote: Quote | undefined; className?: string }) {
  if (!quote) {
    return (
      <div className={cn('space-y-3', className)} aria-busy="true" data-testid="summary-skeleton">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-6" />
        ))}
      </div>
    )
  }
  const row = 'flex items-baseline justify-between gap-4'
  return (
    <dl className={cn('space-y-3 text-body-lg text-foreground', className)} data-testid="quote-totals">
      <div className={row}>
        <dt>Subtotal</dt>
        <dd data-testid="quote-subtotal">{formatEth(quote.subtotalEth)}</dd>
      </div>
      <div className={row}>
        <dt>Desconto do lançamento{quote.coupon?.status === 'applied' && ` (${quote.coupon.code})`}</dt>
        <dd data-testid="quote-discount">(-) {formatEth(quote.discountEth)}</dd>
      </div>
      <div>
        <div className={row}>
          <dt>Taxa de rede</dt>
          <dd data-testid="quote-fee">{formatEth(quote.networkFeeEth)}</dd>
        </div>
        <p className="mt-1 text-right text-caption text-accent">Taxa estimada</p>
      </div>
      <div className={cn(row, 'border-t border-border pt-4 font-bold')}>
        <dt>Total</dt>
        <dd className="text-title-lg text-accent" data-testid="quote-total">
          {formatEth(quote.totalEth)}
        </dd>
      </div>
    </dl>
  )
}

/** "Código promocional" + Aplicar. Invalid and expired codes come back from the API as field errors. */
export function CouponForm({ quote, variant = 'boxed' }: { quote: Quote | undefined; variant?: 'boxed' | 'pill' }) {
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const applied = quote?.coupon?.status === 'applied' ? quote.coupon : null

  // Not a <form>: the coupon also lives inside the checkout form, and forms cannot nest.
  async function submit() {
    setError(null)
    if (!code.trim()) return setError('Informe o código promocional')
    try {
      await apply.mutateAsync(code.trim())
      setCode('')
      announce(`Cupom ${code.trim().toUpperCase()} aplicado. O total foi atualizado.`)
    } catch (e) {
      setError(isApiError(e) ? (e.fields.code ?? e.message) : 'Não foi possível aplicar o cupom.')
    }
  }

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-sm border border-success/60 px-3 py-2 text-body-sm" role="status">
        <span>
          Cupom <strong>{applied.code}</strong>: {applied.message}
        </span>
        <Button
          variant="link"
          size="sm"
          className="h-auto px-0"
          disabled={remove.isPending}
          onClick={() => remove.mutate(undefined, { onSuccess: () => announce('Cupom removido. O total foi atualizado.') })}
        >
          Remover
        </Button>
      </div>
    )
  }

  const pill = variant === 'pill'
  return (
    <div role="group" className="space-y-2" aria-label="Código promocional">
      {!pill && (
        <label htmlFor="coupon" className="text-body-sm font-bold text-foreground">
          Código promocional
        </label>
      )}
      <div className={cn('flex', pill ? 'rounded-full bg-surface-raised p-1' : '')}>
        <input
          id="coupon"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void submit()
            }
          }}
          placeholder="Digite o código promocional..."
          aria-label={pill ? 'Código promocional' : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'coupon-error' : undefined}
          autoComplete="off"
          className={cn(
            'h-10 min-w-0 flex-1 bg-transparent px-3 text-body-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none',
            pill ? 'rounded-full' : 'rounded-l-sm border border-primary focus-visible:border-accent',
          )}
        />
        <Button type="button" onClick={() => void submit()} className={cn('h-10', pill ? 'rounded-full px-5' : 'rounded-l-none')} disabled={apply.isPending} aria-busy={apply.isPending}>
          Aplicar
        </Button>
      </div>
      {error && (
        <p id="coupon-error" className="text-caption text-danger-text" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
