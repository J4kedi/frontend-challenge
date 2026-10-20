import { createFileRoute } from '@tanstack/react-router'
import { catalogSearch } from '@/features/catalog/search'

export const Route = createFileRoute('/')({
  validateSearch: catalogSearch,
  component: () => <h1 className="p-8 text-heading font-bold">Início</h1>,
})
