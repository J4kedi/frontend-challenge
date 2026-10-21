import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '@/features/catalog/HomePage'
import { nftListOptions } from '@/features/catalog/queries'
import { catalogSearch, toListQuery } from '@/features/catalog/search'

export const Route = createFileRoute('/')({
  // Landing route: its component ships with the app bundle instead of a second
  // round of chunks after the router starts (that round delayed the first cards).
  codeSplitGroupings: [],
  validateSearch: catalogSearch,
  // Warms the list on preload; the page renders its own skeletons, so nothing awaits here.
  loaderDeps: ({ search }) => toListQuery(search),
  loader: ({ context, deps }) => {
    // A cancelled prefetch (key changed, page left) is not an error.
    context.queryClient.ensureQueryData(nftListOptions(deps)).catch(() => undefined)
  },
  head: () => ({ meta: [{ title: 'Kurio — Marketplace de NFTs' }] }),
  component: HomePage,
})
