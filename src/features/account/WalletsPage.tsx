import { useState } from 'react'
import { ErrorState } from '@/components/feedback/StatusPage'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import type { Wallet } from '@/contracts/account'
import { AccountLayout } from './AccountLayout'
import { useWallets } from './queries'
import { EMPTY_WALLET, WalletForm, walletToFields } from './WalletForm'

/** Carteiras (Figma "Desktop / Carteiras"): primary and secondary wallets used at checkout. */
export function WalletsPage() {
  const wallets = useWallets()
  return (
    <AccountLayout title="Carteiras" hideTitle>
      {wallets.isPending ? (
        <div className="grid gap-6 md:grid-cols-2" aria-busy="true">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : wallets.isError ? (
        <ErrorState error={wallets.error} onRetry={() => void wallets.refetch()} />
      ) : (
        <WalletSections items={wallets.data.items} />
      )}
    </AccountLayout>
  )
}

function WalletSections({ items }: { items: Wallet[] }) {
  const primary = items.find((w) => w.slot === 'primary')
  const secondary = items.find((w) => w.slot === 'secondary')
  const [adding, setAdding] = useState(false)
  const [sameAsPrimary, setSameAsPrimary] = useState(false)

  return (
    <div className="space-y-12">
      <section aria-labelledby="primary-wallet">
        <h2 id="primary-wallet" className="text-body-lg font-bold">
          Carteira principal
        </h2>
        <p className="mt-1 text-caption-lg text-muted-foreground">Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p>
        <div className="mt-6">
          <WalletForm key={primary?.id ?? 'new-primary'} slot="primary" wallet={primary} defaults={primary ? walletToFields(primary) : EMPTY_WALLET} idPrefix="primary" />
        </div>
      </section>

      <section aria-labelledby="secondary-wallet">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 id="secondary-wallet" className="text-body-lg font-bold">
            Carteira secundária
          </h2>
          {!secondary && !adding && (
            <div className="flex items-center gap-4">
              {primary && (
                <label className="flex items-center gap-2 text-body-sm text-foreground">
                  <Checkbox checked={sameAsPrimary} onCheckedChange={(v) => setSameAsPrimary(v === true)} className="rounded-full border-primary" />
                  Igual à carteira principal
                </label>
              )}
              <button type="button" onClick={() => setAdding(true)} className="text-body-lg font-bold text-accent hover:underline">
                Adicionar
              </button>
            </div>
          )}
        </div>
        {secondary || adding ? (
          <div className="mt-6">
            <WalletForm
              key={secondary?.id ?? `new-secondary-${sameAsPrimary}`}
              slot="secondary"
              wallet={secondary}
              defaults={secondary ? walletToFields(secondary) : sameAsPrimary && primary ? { ...walletToFields(primary), nickname: `${primary.nickname} (reserva)` } : EMPTY_WALLET}
              idPrefix="secondary"
            />
          </div>
        ) : (
          <p className="mt-1 text-caption-lg text-muted-foreground">Você ainda não adicionou uma carteira secundária.</p>
        )}
      </section>
    </div>
  )
}
