import { getRouteApi } from '@tanstack/react-router'
import type { CatalogSearch } from './search'

const homeRoute = getRouteApi('/')

/** Read and write the catalog state kept in the URL of the home route. */
export function useCatalogSearch() {
  const search = homeRoute.useSearch()
  const navigate = homeRoute.useNavigate()

  return {
    search,
    /** Any filter change goes back to page 1. */
    setFilters(patch: Partial<Omit<CatalogSearch, 'page'>>, options: { replace?: boolean } = {}) {
      void navigate({
        search: (prev) => ({ ...prev, ...patch, page: undefined }),
        replace: options.replace,
        resetScroll: false,
      })
    },
    clearFilters() {
      void navigate({ search: {}, resetScroll: false })
    },
  }
}
