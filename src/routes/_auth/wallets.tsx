import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/wallets')({
  component: () => <h1 className="p-8 text-heading font-bold">Carteiras</h1>,
})
