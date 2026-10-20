import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/favorites')({
  component: () => <h1 className="p-8 text-heading font-bold">Lista de interesse</h1>,
})
