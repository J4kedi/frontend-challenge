import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/checkout')({
  component: () => <h1 className="p-8 text-heading font-bold">Pagamento</h1>,
})
