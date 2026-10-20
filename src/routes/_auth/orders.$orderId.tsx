import { createFileRoute } from '@tanstack/react-router'
import { OrderPage } from '@/features/orders/OrderPage'

export const Route = createFileRoute('/_auth/orders/$orderId')({
  head: () => ({ meta: [{ title: 'Pedido — Kurio' }] }),
  component: OrderPage,
})
