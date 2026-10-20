import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/profile')({
  component: () => <h1 className="p-8 text-heading font-bold">Perfil do colecionador</h1>,
})
