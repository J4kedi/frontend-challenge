import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { COLLECTION_LABEL, NETWORK_LABEL, type Collection, type Network, type NftListResponse } from '@/contracts/nft'
import { cn } from '@/shared/lib/cn'
import type { CatalogSearch } from '../search'

type Facets = NftListResponse['facets']

const toggle = <T,>(list: T[] | undefined, value: T) => {
  const next = list?.includes(value) ? list.filter((v) => v !== value) : [...(list ?? []), value]
  return next.length ? next : undefined
}

/** pt-BR label of the Figma filter ("Preço: 0,02 - 12,30 ETH"). */
const brl = (value: number) => value.toFixed(2).replace('.', ',')

/**
 * Sidebar filters (Figma "Sidebar"). Collections and networks combine with
 * each other and with search, tab and price; the counts come from the API.
 */
export function CatalogFilters({
  facets,
  search,
  onChange,
}: {
  facets: Facets | undefined
  search: CatalogSearch
  onChange: (patch: Partial<CatalogSearch>) => void
}) {
  return (
    <div className="space-y-8">
      <FacetGroup
        title="Coleções"
        items={(facets?.collections ?? []).map((f) => ({ id: f.id, label: COLLECTION_LABEL[f.id], count: f.count }))}
        selected={search.collections}
        onToggle={(id) => onChange({ collections: toggle(search.collections, id as Collection) })}
      />
      <PriceFilter key={`${search.priceMin}-${search.priceMax}-${facets?.price.min}`} facets={facets} search={search} onChange={onChange} />
      <FacetGroup
        title="Rede"
        items={(facets?.networks ?? []).map((f) => ({ id: f.id, label: NETWORK_LABEL[f.id], count: f.count }))}
        selected={search.networks}
        onToggle={(id) => onChange({ networks: toggle(search.networks, id as Network) })}
      />
    </div>
  )
}

function FacetGroup({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string
  items: { id: string; label: string; count: number }[]
  selected: string[] | undefined
  onToggle: (id: string) => void
}) {
  const headingId = `facet-${title}`
  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className="text-title-sm font-bold text-foreground">
        {title}
      </h3>
      <ul className="mt-3 space-y-1">
        {items.length === 0
          ? Array.from({ length: 4 }, (_, i) => <li key={i} className="skeleton h-8" />)
          : items.map((item) => {
              const active = selected?.includes(item.id) ?? false
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => onToggle(item.id)}
                    className={cn(
                      'flex h-10 w-full items-center justify-between rounded-sm border-l-2 px-3 text-body-sm transition-colors hover:bg-surface-raised',
                      active ? 'border-primary text-accent' : 'border-transparent text-foreground',
                    )}
                  >
                    <span>{item.label}</span>
                    <span className="font-bold" aria-label={`${item.count} NFTs`}>
                      ({item.count})
                    </span>
                  </button>
                </li>
              )
            })}
      </ul>
    </section>
  )
}

function PriceFilter({
  facets,
  search,
  onChange,
}: {
  facets: Facets | undefined
  search: CatalogSearch
  onChange: (patch: Partial<CatalogSearch>) => void
}) {
  const min = Number(facets?.price.min ?? 0)
  const max = Number(facets?.price.max ?? 0)
  const [range, setRange] = useState<[number, number]>([
    search.priceMin ? Number(search.priceMin) : min,
    search.priceMax ? Number(search.priceMax) : max,
  ])
  const active = Boolean(search.priceMin || search.priceMax)

  function apply() {
    const [low, high] = range
    onChange({
      priceMin: low > min ? low.toFixed(2) : undefined,
      priceMax: high < max ? high.toFixed(2) : undefined,
    })
  }

  return (
    <section aria-labelledby="facet-price">
      <h3 id="facet-price" className="text-title-sm font-bold text-foreground">
        Faixa de preço
      </h3>
      {facets ? (
        <div className="mt-4 space-y-4 px-2">
          <Slider
            min={min}
            max={max}
            step={0.01}
            value={range}
            onValueChange={(value) => setRange([value[0] ?? min, value[1] ?? max])}
            thumbLabels={['Preço mínimo em ETH', 'Preço máximo em ETH']}
          />
          <p className="text-body-sm text-foreground" aria-live="polite">
            Preço: {brl(range[0])} - {brl(range[1])} ETH
          </p>
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={apply}>
              Aplicar
            </Button>
            {active && (
              <Button size="sm" variant="link" onClick={() => onChange({ priceMin: undefined, priceMax: undefined })}>
                Limpar preço
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4 skeleton h-16" />
      )}
    </section>
  )
}
