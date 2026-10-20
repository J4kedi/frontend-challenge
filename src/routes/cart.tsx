import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/cart')({
  component: () => <h1 className="p-8 text-heading font-bold">Carrinho de NFTs</h1>,
})
