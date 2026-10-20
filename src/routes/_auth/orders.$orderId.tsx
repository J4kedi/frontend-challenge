import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/orders/$orderId')({
  component: () => <h1 className="p-8 text-heading font-bold">Pedido</h1>,
})
