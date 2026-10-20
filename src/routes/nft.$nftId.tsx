import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/nft/$nftId')({
  component: () => <h1 className="p-8 text-heading font-bold">Detalhes do NFT</h1>,
})
