import { useState } from 'react'
import { ErrorState } from '@/components/feedback/StatusPage'
import { FormField } from '@/components/form/FormField'
import { PasswordInput } from '@/components/form/PasswordInput'
import { CartIcon, DeleteIcon, SearchIcon, StarIcon, ThankYouIllustration, WalletIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { Skeleton } from '@/components/ui/skeleton'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/NftCard'
import { ApiError } from '@/shared/api/errors'
import { cn } from '@/shared/lib/cn'

/**
 * Living style guide: the tokens of theme.css and the real components, rendered
 * by the app itself. Documentation in docs/design; the page is not indexed.
 */
/** [token, utility, Figma style]; the value shown is read from the CSS variable at runtime. */
const COLORS = [
  ['ink', 'bg-ink', 'Color/Ink'],
  ['surface', 'bg-surface', 'Color/Surface Card'],
  ['surface-raised', 'bg-surface-raised', 'Color/Surface Raised'],
  ['surface-dark', 'bg-surface-dark', 'Color/Surface Dark'],
  ['primary', 'bg-primary', 'Color/Primary'],
  ['accent', 'bg-accent', 'Text/Accent'],
  ['secondary', 'bg-secondary', 'Color/Secondary'],
  ['coral', 'bg-coral', 'Text/Coral'],
  ['amber', 'bg-amber', 'Color/Amber'],
  ['foreground', 'bg-foreground', 'Color/Foreground'],
  ['muted-foreground', 'bg-muted-foreground', 'Text/Secondary'],
  ['border', 'bg-border', 'Color/Border'],
  ['border-soft', 'bg-border-soft', 'Color/Border Soft'],
  ['success', 'bg-success', 'Color/Success'],
  ['danger', 'bg-danger', 'Color/Error'],
  ['danger-text', 'bg-danger-text', 'derivado (contraste)'],
] as const

const TYPE = [
  ['text-display-lg', '43/70', 'Display/43 Bold'],
  ['text-display', '32/42', 'Display/32 Bold'],
  ['text-heading-lg', '28/37', 'Heading/28 Bold'],
  ['text-heading', '24/32', 'Heading/24 Bold'],
  ['text-title-lg', '22/29', 'Title/22'],
  ['text-title', '20/28', 'Title/20'],
  ['text-title-sm', '18/24', 'Body Large/18'],
  ['text-body-lg', '16/21', 'Body Large/16'],
  ['text-body', '15/20', 'Body/15'],
  ['text-body-sm', '14/20', 'Body/14'],
  ['text-caption-lg', '13/22', 'Caption/13'],
  ['text-caption', '12/16', 'Caption/12'],
  ['text-tiny', '10/13', 'Tiny/10'],
  ['text-micro', '9/12', 'Tiny/9'],
] as const

const RADII = [
  ['rounded-xs', '3px'],
  ['rounded-sm', '4px'],
  ['rounded-md', '6px'],
  ['rounded-lg', '8px'],
  ['rounded-xl', '16px'],
] as const

const SAMPLE = {
  id: 'emerald-ape-042',
  name: 'Emerald Ape #042',
  tokenId: '#0042',
  collection: 'arte-digital',
  network: 'ethereum',
  artwork: 'emerald',
  priceEth: '1.19',
  previousPriceEth: '1.39',
  available: 12,
  rare: true,
  listedAt: '2026-10-20T12:00:00.000Z',
  version: 1,
} as const

/** Live value of a theme token, so this page can never drift from theme.css. */
function TokenValue({ name }: { name: string }) {
  const [value] = useState(() => getComputedStyle(document.documentElement).getPropertyValue(name).trim())
  return <code>{value}</code>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-t border-border pt-8" aria-label={title}>
      <h2 className="text-heading font-bold">{title}</h2>
      {children}
    </section>
  )
}

export function DesignSystemPage() {
  const [quantity, setQuantity] = useState(2)
  return (
    <div className="mx-auto max-w-page space-y-12 px-4 py-10 md:px-6 xl:px-0">
      <title>Design system — Kurio</title>
      <meta name="robots" content="noindex" />
      <header className="space-y-2">
        <p className="text-body-sm text-accent">Figma · versão 2397163412428844678</p>
        <h1 className="text-display font-bold">Design system Kurio</h1>
        <p className="max-w-2xl text-body-sm text-muted-foreground">
          Tokens de <code>src/styles/theme.css</code> e componentes reais do app. Documentação em <code>docs/design</code>.
        </p>
      </header>

      <Section title="Cores">
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {COLORS.map(([name, cls, figma]) => (
            <li key={name} className="overflow-hidden rounded-lg border border-border">
              <div className={cn('h-16', cls)} />
              <div className="p-3">
                <p className="text-body-sm font-bold">{name}</p>
                <p className="text-caption text-muted-foreground">
                  <TokenValue name={`--color-${name}`} /> · {figma}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Tipografia — Roboto Mono">
        <ul className="space-y-3">
          {TYPE.map(([cls, size, figma]) => (
            <li key={cls} className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
              <span className="w-40 shrink-0 text-caption text-muted-foreground">
                {cls} · {size}
              </span>
              <span className={cn(cls, 'font-bold')}>Seja dono do futuro</span>
              <span className="text-caption text-muted-foreground">{figma}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Raio e sombra">
        <div className="flex flex-wrap gap-6">
          {RADII.map(([cls, value]) => (
            <div key={cls} className="space-y-2 text-center">
              <div className={cn('size-20 border border-primary bg-surface', cls)} />
              <p className="text-caption text-muted-foreground">
                {cls} · {value}
              </p>
            </div>
          ))}
          {(['shadow-card', 'shadow-raised', 'shadow-overlay'] as const).map((cls) => (
            <div key={cls} className="space-y-2 text-center">
              <div className={cn('size-20 rounded-lg bg-surface-raised', cls)} />
              <p className="text-caption text-muted-foreground">{cls}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Botões">
        <div className="flex flex-wrap items-center gap-4">
          <Button>Explorar</Button>
          <Button variant="outline">Favoritar</Button>
          <Button variant="secondary">Secundário</Button>
          <Button variant="ghost">Fantasma</Button>
          <Button variant="link">Continuar explorando</Button>
          <Button disabled>Desabilitado</Button>
          <Button aria-busy>Enviando pedido…</Button>
          <Button size="pill">Comprar NFT</Button>
          <Button size="icon" aria-label="Carrinho">
            <CartIcon className="size-5" />
          </Button>
        </div>
      </Section>

      <Section title="Formulários">
        <div className="grid max-w-3xl gap-6 md:grid-cols-2">
          <FormField label="Nome de exibição" required>
            {(f) => <Input {...f} defaultValue="Ana Colecionadora" />}
          </FormField>
          <FormField label="E-mail" required error="E-mail inválido">
            {(f) => <Input {...f} defaultValue="ana@" />}
          </FormField>
          <FormField label="Senha" hint="Mínimo de 8 caracteres, com letra e número">
            {(f) => <PasswordInput {...f} defaultValue="kurio2026" />}
          </FormField>
          <div className="space-y-2">
            <p className="text-body-sm">Quantidade</p>
            <QuantityStepper value={quantity} max={3} onChange={setQuantity} label="Quantidade de exemplo" />
          </div>
        </div>
      </Section>

      <Section title="Cards e carregamento">
        <ul className="grid max-w-3xl grid-cols-2 gap-6 md:grid-cols-3">
          <li>
            <NftCard nft={SAMPLE} />
          </li>
          <li>
            <NftCard nft={{ ...SAMPLE, id: 'sample-sold', name: 'Golden Beat #207', artwork: 'golden', previousPriceEth: null, available: 0, rare: false }} />
          </li>
          <li>
            <NftCardSkeleton />
          </li>
        </ul>
        <Skeleton className="h-10 max-w-md" />
      </Section>

      <Section title="Feedback">
        <div className="grid max-w-3xl gap-6 md:grid-cols-2">
          <ErrorState error={new ApiError(503, 'UNAVAILABLE', 'Serviço temporariamente indisponível. Tente novamente.')} onRetry={() => undefined} />
          <div className="space-y-3">
            <p role="status" className="rounded-sm border border-amber/60 bg-amber/10 p-4 text-body-sm">
              O preço de Emerald Ape #042 mudou enquanto você navegava.
            </p>
            <p className="rounded-sm border border-success/60 px-3 py-2 text-body-sm">
              Cupom <strong>KURIO10</strong>: 10% de desconto aplicado
            </p>
          </div>
        </div>
      </Section>

      <Section title="Ícones do Figma">
        <div className="flex flex-wrap items-center gap-6 text-primary">
          <SearchIcon className="size-6" />
          <CartIcon className="size-6" />
          <WalletIcon className="size-6" />
          <DeleteIcon className="size-6" />
          <StarIcon className="size-6" />
          <ThankYouIllustration className="size-16" />
        </div>
      </Section>
    </div>
  )
}
