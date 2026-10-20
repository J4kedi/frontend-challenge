import { createFileRoute } from '@tanstack/react-router'
import { FavoritesPage } from '@/features/favorites/FavoritesPage'

export const Route = createFileRoute('/_auth/favorites')({
  head: () => ({ meta: [{ title: 'Lista de interesse — Kurio' }] }),
  component: FavoritesPage,
})
