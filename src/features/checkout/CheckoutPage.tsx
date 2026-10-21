import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'
import { useEffect, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { ErrorState } from '@/components/feedback/StatusPage'
import { FormError, FormField } from '@/components/form/FormField'
import { ArrowLeftIcon } from '@/components/icons'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  WALLET_PROVIDER_LABEL,
  walletProvider,
  type User,
  type Wallet,
  type WalletProvider,
  type WalletSlot,
} from '@/contracts/account'
import { checkoutBuyer, quote as quoteSchema, type Quote } from '@/contracts/commerce'
import { network as networkSchema, NETWORK_LABEL, type Network } from '@/contracts/nft'
import { EnsInput } from '@/features/account/EnsField'
import { useWallets, useWalletConnection } from '@/features/account/queries'
import { useCartOwner, useSession } from '@/features/auth/session'
import { CouponForm, QuoteTotals } from '@/features/cart/components/QuoteSummary'
import { QuoteNotice } from '@/features/cart/components/QuoteNotice'
import { useCart, useQuote } from '@/features/cart/queries'
import { NftImage } from '@/features/catalog/components/NftImage'
import { usePendingOrders } from '@/features/orders/queries'
import { announce } from '@/shared/a11y/announcer'
import { isApiError } from '@/shared/api/errors'
import { queryKeys } from '@/shared/api/query-keys'
import { cn } from '@/shared/lib/cn'
import { formatEth } from '@/shared/lib/money'
import { clearDraft, readDraft, saveDraft } from './draft'
import { submitPurchase } from './purchase-attempt'
import { ReviewDialog } from './ReviewDialog'

const checkoutForm = z.object({ buyer: checkoutBuyer, network: networkSchema, provider: walletProvider })
type CheckoutForm = z.infer<typeof checkoutForm>

const PROVIDER_BADGE: Record<WalletProvider, string> = { walletconnect: 'W', metamask: 'M', coinbase: 'C' }
const PROVIDER_ORDER: WalletProvider[] = ['walletconnect', 'metamask', 'coinbase']

/** EVM addresses pay on Ethereum or Polygon; Solana addresses only on Solana. */
const networksFor = (wallet: Wallet): Network[] => (wallet.network === 'solana' ? ['solana'] : ['ethereum', 'polygon'])

const defaultsFrom = (wallet: Wallet, user: User): CheckoutForm => ({
  buyer: {
    displayName: wallet.displayName,
    username: user.username,
    profileName: wallet.profileName,
    email: wallet.email,
    ensName: wallet.ensName,
    referralCode: wallet.referralCode,
    note: '',
  },
  network: wallet.network,
  provider: wallet.provider,
})

/** Pagamento (Figma "Desktop / Pagamento" and "Mobile / Pagamento"). */
export function CheckoutPage() {
  const { user } = useSession()
  const cart = useCart()
  const wallets = useWallets()
  const router = useRouter()

  return (
    <div className="mx-auto max-w-page px-4 pt-6 md:px-6 md:pt-8 xl:px-0">
      <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/', hash: 'mercado' }, { label: 'Pagamento' }]} />
      <div className="mt-2 flex items-center gap-4 md:hidden">
        <button
          type="button"
          onClick={() => (router.history.canGoBack() ? router.history.back() : void router.navigate({ to: '/cart' }))}
          aria-label="Voltar"
          className="grid size-9 place-items-center rounded-full bg-surface-raised"
        >
          <ArrowLeftIcon className="size-5" />
        </button>
        <h1 className="text-title font-bold">Pagamento com carteira</h1>
      </div>
      <h1 className="sr-only max-md:hidden">Pagamento com carteira</h1>
      {!user || cart.isPending || wallets.isPending ? (
        <CheckoutSkeleton />
      ) : cart.isError || wallets.isError ? (
        <div className="mt-8">
          <ErrorState error={cart.error ?? wallets.error} onRetry={() => void (cart.isError ? cart.refetch() : wallets.refetch())} />
        </div>
      ) : cart.data.lines.length === 0 ? (
        <Blocked title="Seu carrinho está vazio" text="Adicione NFTs ao carrinho antes de pagar." to="/" label="Explorar o mercado" />
      ) : !wallets.data.items.some((w) => w.slot === 'primary') ? (
        <Blocked title="Cadastre uma carteira" text="O pagamento usa as carteiras cadastradas no seu perfil." to="/wallets" label="Cadastrar carteira" />
      ) : (
        <CheckoutForm user={user} wallets={wallets.data.items} />
      )}
    </div>
  )
}

function CheckoutForm({ user, wallets }: { user: User; wallets: Wallet[] }) {
  const draft = readDraft(user.id)
  const [walletSlot, setWalletSlot] = useState<WalletSlot>(draft?.walletSlot ?? 'primary')
  const wallet = wallets.find((w) => w.slot === walletSlot) ?? wallets.find((w) => w.slot === 'primary')!
  const secondary = wallets.find((w) => w.slot === 'secondary')
  const [showBuyer, setShowBuyer] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutForm),
    // A draft from before the wallet changed (e.g. to Solana) must not bring back a network it cannot use.
    defaultValues:
      draft && networksFor(wallet).includes(draft.network)
        ? { buyer: draft.buyer, network: draft.network, provider: draft.provider }
        : defaultsFrom(wallet, user),
  })
  const { errors } = form.formState
  const network = useWatch({ control: form.control, name: 'network' })
  const provider = useWatch({ control: form.control, name: 'provider' })

  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const owner = useCartOwner()
  const quote = useQuote(network)
  const pending = usePendingOrders()
  const { connect, disconnect } = useWalletConnection()

  // Keep the draft in sessionStorage so a re-login after expiry resumes here.
  useEffect(
    () =>
      form.subscribe({
        formState: { values: true },
        callback: ({ values }) => {
          const parsed = checkoutForm.safeParse(values)
          if (parsed.success) saveDraft(user.id, { ...parsed.data, walletSlot })
        },
      }),
    [form, user.id, walletSlot],
  )

  const connected =
    wallet.connection?.status === 'connected' && wallet.connection.network === network && wallet.connection.provider === provider
  // A purchase still settling blocks a second one (refresh or reconnect mid-payment).
  const inFlightId = pending.data?.items.find((o) => o.status === 'pending')?.id

  function switchWallet(slot: WalletSlot) {
    const next = wallets.find((w) => w.slot === slot)
    if (!next) return
    setWalletSlot(slot)
    form.reset(defaultsFrom(next, user))
    setConnectError(null)
    announce(`Carteira ${slot === 'primary' ? 'principal' : 'secundária'} selecionada.`)
  }

  function connectWallet() {
    setConnectError(null)
    connect.mutate(
      { id: wallet.id, body: { provider, network } },
      {
        onSuccess: () => {
          setConnectError(null)
          announce(`${WALLET_PROVIDER_LABEL[provider]} conectada na ${NETWORK_LABEL[network]}.`)
        },
        onError: (error) => setConnectError(isApiError(error) ? error.message : 'Não foi possível conectar a carteira.'),
      },
    )
  }

  const openReview = form.handleSubmit(
    async () => {
      setSubmitError(null)
      if (!connected) {
        setConnectError('Conecte a carteira na rede escolhida para continuar.')
        document.getElementById('connect-wallet')?.focus()
        return
      }
      // Revalidate price, stock, coupon and fees before showing the review.
      const fresh = await quote.refetch()
      if (fresh.isError) {
        setSubmitError('Não foi possível confirmar os valores agora. Verifique a conexão e tente de novo.')
        return
      }
      setReviewOpen(true)
    },
    () => {
      setShowBuyer(true)
      announce('Revise os campos destacados do formulário.')
    },
  )

  async function confirmPurchase(current: Quote) {
    if (submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const values = form.getValues()
      const order = await submitPurchase(user.id, {
        quoteId: current.id,
        network: values.network,
        walletId: wallet.id,
        provider: values.provider,
        buyer: values.buyer,
      })
      clearDraft(user.id)
      queryClient.setQueryData(queryKeys.user(user.id).order(order.id), order)
      // Coming back to checkout now shows "compra em processamento" and blocks a second purchase.
      void queryClient.invalidateQueries({ queryKey: queryKeys.user(user.id).pendingOrders })
      announce('Pedido enviado. Aguardando a confirmação da rede.')
      void navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
    } catch (error) {
      if (isApiError(error, 'QUOTE_STALE')) {
        const fresh = quoteSchema.safeParse((error.details as { quote?: unknown } | undefined)?.quote)
        if (fresh.success) queryClient.setQueryData(queryKeys.quote(owner, network), fresh.data)
        void queryClient.invalidateQueries({ queryKey: queryKeys.cart(owner) })
        setSubmitError('Preço, disponibilidade ou taxas mudaram. Confira os novos valores e confirme novamente.')
      } else {
        setSubmitError(isApiError(error) ? error.message : 'Não foi possível concluir a compra. Tente novamente.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const selectTrigger = 'h-10 w-full rounded-sm border-border bg-transparent px-3 text-body-sm text-foreground aria-invalid:border-danger'

  return (
    <form onSubmit={openReview} noValidate className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,762px)_405px] lg:justify-between" aria-label="Pagamento">
      <section aria-labelledby="buyer-title" className="order-2 lg:order-1">
        <div className="flex items-center justify-between">
          <h2 id="buyer-title" className="text-title-sm font-bold">
            Perfil do colecionador
          </h2>
          <button type="button" className="text-body-sm text-accent lg:hidden" aria-expanded={showBuyer} aria-controls="buyer-fields" onClick={() => setShowBuyer((v) => !v)}>
            {showBuyer ? 'Ocultar dados' : 'Revisar dados'}
          </button>
        </div>
        <div id="buyer-fields" className={cn('mt-4 space-y-6', !showBuyer && 'max-lg:hidden')}>
          <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
            <FormField label="Nome de exibição" required error={errors.buyer?.displayName?.message}>
              {(f) => <Input {...f} {...form.register('buyer.displayName')} autoComplete="name" />}
            </FormField>
            <FormField label="Nome de usuário" required error={errors.buyer?.username?.message}>
              {(f) => <Input {...f} {...form.register('buyer.username')} autoComplete="username" />}
            </FormField>
            <FormField label="Rede" required error={errors.network?.message}>
              {(f) => (
                <Controller
                  control={form.control}
                  name="network"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={(v) => field.onChange(v)}>
                      <SelectTrigger {...f} className={selectTrigger} onBlur={field.onBlur}>
                        <SelectValue placeholder="Selecione uma rede" />
                      </SelectTrigger>
                      <SelectContent>
                        {networksFor(wallet).map((n) => (
                          <SelectItem key={n} value={n}>
                            {NETWORK_LABEL[n]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
            </FormField>
            <FormField label="Nome do perfil" required error={errors.buyer?.profileName?.message}>
              {(f) => <Input {...f} {...form.register('buyer.profileName')} />}
            </FormField>
            <FormField label="Endereço da carteira" required hint={`Carteira ${walletSlot === 'primary' ? 'principal' : 'secundária'}: ${wallet.nickname}`}>
              {(f) => <Input {...f} value={wallet.address} readOnly spellCheck={false} />}
            </FormField>
            <FormField label="ENS ou carteira secundária (opcional)" hideLabel className="md:self-start md:pt-7">
              {(f) => <Input {...f} value={wallet.secondaryAddress ?? ''} placeholder="ENS ou carteira secundária (opcional)" readOnly />}
            </FormField>
            <FormField label="Tipo de carteira" required>
              {(f) => <Input {...f} value={WALLET_PROVIDER_LABEL[wallet.provider]} readOnly />}
            </FormField>
            <FormField label="Código de indicação" required error={errors.buyer?.referralCode?.message}>
              {(f) => <Input {...f} {...form.register('buyer.referralCode')} />}
            </FormField>
            <FormField label="E-mail" required error={errors.buyer?.email?.message}>
              {(f) => <Input {...f} {...form.register('buyer.email')} type="email" autoComplete="email" />}
            </FormField>
            <FormField label="Nome ENS" required error={errors.buyer?.ensName?.message}>
              {(f) => <EnsInput {...f} {...form.register('buyer.ensName')} />}
            </FormField>
          </div>
          {secondary && (
            <label className="hidden items-center gap-2 text-body-sm text-foreground lg:flex">
              <input
                type="checkbox"
                checked={walletSlot === 'secondary'}
                onChange={(e) => switchWallet(e.target.checked ? 'secondary' : 'primary')}
                className="size-4 accent-primary"
              />
              Usar outra carteira? ({secondary.nickname})
            </label>
          )}
          <FormField label="Observação do colecionador (opcional)" error={errors.buyer?.note?.message} className="md:max-w-sm">
            {(f) => <textarea {...f} {...form.register('buyer.note')} rows={5} className="rounded-sm border border-border bg-transparent p-3 text-body-sm text-foreground focus-visible:border-primary focus-visible:outline-none" />}
          </FormField>
        </div>
      </section>

      <aside aria-label="Resumo do pedido" className="order-1 space-y-6 lg:order-2">
        <WalletChooser wallets={wallets} selected={walletSlot} onSelect={switchWallet} />

        <section aria-labelledby="items-title" className="hidden lg:block">
          <h2 id="items-title" className="text-title-sm font-bold">
            Seus NFTs
          </h2>
          <OrderItems quote={quote.data} />
        </section>

        <QuoteNotice quote={quote.data} />
        <details className="group">
          <summary className="cursor-pointer list-none text-center text-body-sm text-foreground">
            Tem um código promocional? <span className="text-accent">Aplique aqui</span>
          </summary>
          <div className="mt-3">
            <CouponForm quote={quote.data} />
          </div>
        </details>
        {quote.isError ? <ErrorState error={quote.error} onRetry={() => void quote.refetch()} /> : <QuoteTotals quote={quote.data} />}

        <fieldset className="space-y-3">
          <legend className="mb-3 w-full text-center text-title-sm font-bold">Carteira e rede</legend>
          <Controller
            control={form.control}
            name="provider"
            render={({ field }) => (
              <RadioGroupPrimitive.Root value={field.value} onValueChange={(v) => field.onChange(v)} aria-label="Extensão de carteira" className="space-y-3">
                {PROVIDER_ORDER.map((p) => (
                  <RadioGroupPrimitive.Item
                    key={p}
                    value={p}
                    className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-left text-body-lg text-foreground data-[state=checked]:border-primary"
                  >
                    <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-surface-raised text-body-sm font-bold text-accent">
                      {PROVIDER_BADGE[p]}
                    </span>
                    <span className="flex-1">{WALLET_PROVIDER_LABEL[p]}</span>
                    <span aria-hidden="true" className="grid size-5 place-items-center rounded-full border border-primary">
                      <span className={cn('size-2.5 rounded-full', field.value === p ? 'bg-primary' : 'bg-transparent')} />
                    </span>
                  </RadioGroupPrimitive.Item>
                ))}
              </RadioGroupPrimitive.Root>
            )}
          />
          <ConnectionStatus
            connected={connected}
            provider={provider}
            network={network}
            busy={connect.isPending || disconnect.isPending}
            onConnect={connectWallet}
            onDisconnect={() =>
              disconnect.mutate(wallet.id, {
                onSuccess: () => announce('Carteira desconectada.'),
                onError: (error) => setConnectError(isApiError(error) ? error.message : 'Não foi possível desconectar a carteira.'),
              })
            }
            error={connectError}
          />
        </fieldset>

        {inFlightId && (
          <p role="status" className="rounded-sm border border-amber/60 bg-amber/10 p-3 text-body-sm">
            Você tem uma compra em processamento.{' '}
            <Link to="/orders/$orderId" params={{ orderId: inFlightId }} className="font-bold text-accent underline">
              Acompanhar pedido
            </Link>
          </p>
        )}
        <FormError message={submitError && !reviewOpen ? submitError : null} />
        <Button type="submit" size="lg" className="h-12 w-full max-md:h-15 max-md:rounded-full" disabled={Boolean(inFlightId) || !quote.data}>
          Confirmar compra
        </Button>
      </aside>

      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        quote={quote.data}
        isRefreshing={quote.isFetching}
        wallet={wallet}
        network={network}
        provider={provider}
        buyerName={form.getValues('buyer.displayName')}
        submitting={submitting}
        error={submitError}
        onConfirm={confirmPurchase}
      />
    </form>
  )
}

function WalletChooser({ wallets, selected, onSelect }: { wallets: Wallet[]; selected: WalletSlot; onSelect: (slot: WalletSlot) => void }) {
  return (
    <section aria-labelledby="wallet-title" className="lg:hidden">
      <div className="flex items-center justify-between">
        <h2 id="wallet-title" className="text-body-lg font-bold">
          Carteira conectada
        </h2>
        <Link to="/wallets" className="text-body-sm font-bold text-accent">
          Trocar carteira
        </Link>
      </div>
      <RadioGroupPrimitive.Root value={selected} onValueChange={(v) => onSelect(v as WalletSlot)} aria-labelledby="wallet-title" className="mt-3 space-y-3">
        {[...wallets].sort((a) => (a.slot === 'secondary' ? -1 : 1)).map((w) => (
          <RadioGroupPrimitive.Item key={w.id} value={w.slot} className="flex w-full items-start gap-3 rounded-lg bg-surface p-4 text-left data-[state=checked]:ring-1 data-[state=checked]:ring-primary">
            <span aria-hidden="true" className="mt-1 grid size-4 place-items-center rounded-full border border-primary">
              <span className={cn('size-2 rounded-full', selected === w.slot ? 'bg-primary' : 'bg-transparent')} />
            </span>
            <span>
              <span className="block text-body-lg font-bold">{w.slot === 'primary' ? 'Principal' : 'Reserva'}</span>
              <span className="block text-body-sm text-muted-foreground">{`${w.address.slice(0, 6)}…${w.address.slice(-4)}`}</span>
              <span className="block text-body-sm text-muted-foreground">Rede {NETWORK_LABEL[w.network]}</span>
            </span>
          </RadioGroupPrimitive.Item>
        ))}
      </RadioGroupPrimitive.Root>
    </section>
  )
}

function ConnectionStatus({
  connected,
  provider,
  network,
  busy,
  onConnect,
  onDisconnect,
  error,
}: {
  connected: boolean
  provider: WalletProvider
  network: Network
  busy: boolean
  onConnect: () => void
  onDisconnect: () => void
  error: string | null
}) {
  return (
    <div className="rounded-lg border border-border-soft p-4" data-testid="wallet-connection">
      <p className="text-body-sm" role="status">
        {connected ? (
          <>
            <span aria-hidden="true" className="mr-2 inline-block size-2 rounded-full bg-success" />
            {WALLET_PROVIDER_LABEL[provider]} conectada na {NETWORK_LABEL[network]}
          </>
        ) : busy ? (
          'Aguardando aprovação na carteira…'
        ) : (
          `Conecte a ${WALLET_PROVIDER_LABEL[provider]} na ${NETWORK_LABEL[network]} para pagar.`
        )}
      </p>
      <div className="mt-3">
        {connected ? (
          <Button type="button" variant="outline" size="sm" onClick={onDisconnect} disabled={busy}>
            Desconectar
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" id="connect-wallet" onClick={onConnect} disabled={busy} aria-busy={busy}>
            {busy ? 'Conectando…' : 'Conectar carteira'}
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-caption text-danger-text">
          {error}
        </p>
      )}
    </div>
  )
}

export function OrderItems({ quote }: { quote: Quote | undefined }) {
  if (!quote) return <Skeleton className="mt-3 h-40" />
  return (
    <ul className="mt-3 space-y-2">
      {quote.lines.map((line) => (
        <li key={line.lineId} className="flex items-center gap-3 rounded-sm bg-surface p-1 pr-3">
          <div className="w-16 shrink-0 overflow-hidden rounded-sm">
            <NftImage artwork={line.artwork} alt="" sizes="64px" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-body font-bold wrap-anywhere sm:text-body-lg">{line.name}</p>
            <p className="text-body-sm text-muted-foreground">ID do token: {line.tokenId}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end sm:flex-row sm:items-center sm:gap-3">
            <span className="text-body-sm text-muted-foreground">(x {line.quantity})</span>
            <span className="text-title-sm font-bold text-accent">{formatEth(line.lineTotalEth)}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}

function Blocked({ title, text, to, label }: { title: string; text: string; to: '/' | '/wallets'; label: string }) {
  return (
    <div className="mt-8 flex flex-col items-center gap-3 rounded-lg border border-border-soft bg-surface px-6 py-16 text-center">
      <p className="text-title-sm font-bold">{title}</p>
      <p className="text-body-sm text-muted-foreground">{text}</p>
      <Button asChild variant="outline">
        <Link to={to}>{label}</Link>
      </Button>
    </div>
  )
}

function CheckoutSkeleton() {
  return (
    <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,762px)_405px] lg:justify-between" aria-busy="true">
      <p role="status" className="sr-only">
        Carregando pagamento…
      </p>
      <div className="grid gap-5 md:grid-cols-2">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-12" />
      </div>
    </div>
  )
}
