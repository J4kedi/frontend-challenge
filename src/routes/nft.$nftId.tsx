import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { nftDetailOptions, relatedOptions } from '@/features/catalog/queries'
import { NftDetailPage } from '@/features/nft/NftDetailPage'

export const Route = createFileRoute('/nft/$nftId')({
  // ?edition=1-10 keeps the chosen edition shareable and survives refresh.
  validateSearch: z.object({ edition: z.string().optional().catch(undefined) }),
  loader: ({ context, params }) => {
    // Warm-up only: the page shows its own skeleton and 404 state.
    context.queryClient.ensureQueryData(nftDetailOptions(params.nftId)).catch(() => undefined)
    context.queryClient.ensureQueryData(relatedOptions(params.nftId)).catch(() => undefined)
  },
  component: NftDetailPage,
})
