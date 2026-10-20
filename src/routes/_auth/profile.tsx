import { createFileRoute } from '@tanstack/react-router'
import { ProfilePage } from '@/features/account/ProfilePage'

export const Route = createFileRoute('/_auth/profile')({
  head: () => ({ meta: [{ title: 'Perfil do colecionador — Kurio' }] }),
  component: ProfilePage,
})
