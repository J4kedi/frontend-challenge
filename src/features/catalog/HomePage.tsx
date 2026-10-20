import { useQuery } from '@tanstack/react-query'
import { DESKTOP_QUERY, useMediaQuery } from '@/shared/hooks/use-media-query'
import { CatalogFilters } from './components/CatalogFilters'
import { CatalogResults } from './components/CatalogResults'
import { FiltersSheet, SearchField, SortSelect, TabsFilter } from './components/CatalogToolbar'
import { BlogSection, FeaturedNft, PromoCards } from './components/HomeEditorial'
import { HomeHero } from './components/HomeHero'
import { nftListOptions } from './queries'
import { toListQuery } from './search'
import { useCatalogSearch } from './use-catalog-search'

/** Início (Figma "Desktop / Início" and "Mobile / Início"). */
export function HomePage() {
  const { search, setFilters, clearFilters } = useCatalogSearch()
  const list = useQuery(nftListOptions(toListQuery(search)))
  const facets = list.data?.facets
  // One search box in the DOM (ids and labels stay unique): top bar on mobile, toolbar from md up.
  const desktop = useMediaQuery(DESKTOP_QUERY)

  return (
    <>
      {!desktop && (
        <div className="mx-auto flex max-w-page gap-3 px-4 pt-6">
          <SearchField value={search.q} onSearch={(q) => setFilters({ q }, { replace: true })} className="flex-1" />
          <FiltersSheet facets={facets} search={search} total={list.data?.total} onChange={setFilters} />
        </div>
      )}

      <HomeHero />

      <section id="mercado" aria-labelledby="mercado-title" className="mx-auto mt-10 max-w-page px-4 md:mt-16 md:px-6 xl:px-0">
        <h2 id="mercado-title" className="sr-only">
          Mercado de NFTs
        </h2>
        <div className="grid gap-12 lg:grid-cols-[310px_minmax(0,1fr)]">
          <aside aria-label="Filtros do catálogo" className="hidden space-y-12 lg:block">
            <div className="rounded-lg bg-surface p-5">
              <CatalogFilters facets={facets} search={search} onChange={setFilters} />
            </div>
            <FeaturedNft />
          </aside>

          <div>
            {desktop && (
              <div className="flex items-center gap-3">
                <SearchField value={search.q} onSearch={(q) => setFilters({ q }, { replace: true })} className="flex-1" />
                <div className="lg:hidden">
                  <FiltersSheet facets={facets} search={search} total={list.data?.total} onChange={setFilters} />
                </div>
              </div>
            )}
            <div className="mt-0 mb-6 flex flex-wrap items-center justify-between gap-4 md:mt-6">
              <TabsFilter value={search.tab} onChange={setFilters} />
              <div className="hidden md:block">
                <SortSelect value={search.sort} onChange={setFilters} />
              </div>
            </div>
            <CatalogResults
              data={list.data}
              isPending={list.isPending}
              isFetching={list.isFetching}
              error={list.error}
              onRetry={() => void list.refetch()}
              onClear={clearFilters}
            />
          </div>
        </div>
      </section>

      <PromoCards />
      <BlogSection />
    </>
  )
}
