import { useEffect, useRef } from 'react'
import { FilterIcon, SearchIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { SORT_LABEL, SORTS, TAB_LABEL, TABS, type NftListResponse, type Sort } from '@/contracts/nft'
import { cn } from '@/shared/lib/cn'
import type { CatalogSearch } from '../search'
import { CatalogFilters } from './CatalogFilters'

type Patch = Partial<CatalogSearch>

/** Search box bound to `?q=`. Uncontrolled + debounced, so typing never fights the URL. */
export function SearchField({ value, onSearch, className }: { value: string | undefined; onSearch: (q: string | undefined) => void; className?: string }) {
  const input = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Back/forward changes ?q=: mirror it unless the user is typing.
  useEffect(() => {
    if (input.current && document.activeElement !== input.current) input.current.value = value ?? ''
  }, [value])
  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <div className={cn('relative', className)} role="search">
      <label htmlFor="catalog-search" className="sr-only">
        Buscar NFTs por nome, coleção ou ID do token
      </label>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={input}
        id="catalog-search"
        type="search"
        maxLength={80}
        defaultValue={value}
        placeholder="Explorar coleções"
        autoComplete="off"
        onChange={(event) => {
          const next = event.target.value.trim()
          clearTimeout(timer.current)
          timer.current = setTimeout(() => onSearch(next || undefined), 300)
        }}
        className="h-11 w-full rounded-lg border border-border bg-surface pr-3 pl-10 text-body-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary"
      />
    </div>
  )
}

export function TabsFilter({ value, onChange }: { value: CatalogSearch['tab']; onChange: (patch: Patch) => void }) {
  const current = value ?? 'all'
  return (
    <div role="group" aria-label="Listagem" className="flex max-w-full min-w-0 flex-wrap gap-x-5 gap-y-2">
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          aria-pressed={current === tab}
          onClick={() => onChange({ tab: tab === 'all' ? undefined : tab })}
          className={cn(
            'shrink-0 border-b-2 pb-1 text-body-sm font-medium whitespace-nowrap transition-colors',
            current === tab ? 'border-primary text-accent' : 'border-transparent text-foreground hover:text-accent',
          )}
        >
          {TAB_LABEL[tab]}
        </button>
      ))}
    </div>
  )
}

export function SortSelect({ value, onChange }: { value: Sort | undefined; onChange: (patch: Patch) => void }) {
  return (
    <div className="flex items-center gap-1 text-body-sm">
      <span id="sort-label" className="text-foreground">
        Ordenar por:
      </span>
      <Select value={value ?? 'recent'} onValueChange={(next) => onChange({ sort: next === 'recent' ? undefined : (next as Sort) })}>
        <SelectTrigger aria-labelledby="sort-label" className="h-8 border-0 bg-transparent px-1 text-body-sm text-foreground">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORTS.map((sort) => (
            <SelectItem key={sort} value={sort}>
              {SORT_LABEL[sort]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/** Filters for screens without the sidebar (mobile and tablet): same controls in a sheet. */
export function FiltersSheet({
  facets,
  search,
  total,
  onChange,
}: {
  facets: NftListResponse['facets'] | undefined
  search: CatalogSearch
  total: number | undefined
  onChange: (patch: Patch) => void
}) {
  const active = (search.collections?.length ?? 0) + (search.networks?.length ?? 0) + (search.priceMin || search.priceMax ? 1 : 0)
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="icon" className="relative size-11 shrink-0 rounded-lg" aria-label={`Filtros${active ? `, ${active} ativos` : ''}`}>
          <FilterIcon className="size-5" />
          {active > 0 && (
            <span aria-hidden="true" className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-foreground text-micro text-ink">
              {active}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-sm overflow-y-auto border-border bg-surface p-6">
        <SheetHeader className="p-0">
          <SheetTitle className="text-title font-bold text-foreground">Filtros</SheetTitle>
          <SheetDescription className="text-body-sm text-muted-foreground">
            {total === undefined ? 'Carregando resultados…' : `${total} NFTs com os filtros atuais`}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-8">
          <SortSelect value={search.sort} onChange={onChange} />
          <CatalogFilters facets={facets} search={search} onChange={onChange} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
