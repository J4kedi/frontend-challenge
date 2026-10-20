import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { AuthScreen } from '@/features/auth/AuthScreen'
import { safeRedirect } from '@/features/auth/session'
import { sessionStore } from '@/shared/session/session-store'

const authSearch = z.object({
  redirect: z.string().optional().catch(undefined),
  reason: z.enum(['expired']).optional().catch(undefined),
})

export const Route = createFileRoute('/login')({
  validateSearch: authSearch,
  beforeLoad: ({ search }) => {
    if (sessionStore.token()) throw redirect({ href: safeRedirect(search.redirect) })
  },
  head: () => ({ meta: [{ title: 'Entrar — Kurio' }] }),
  component: function LoginRoute() {
    const search = Route.useSearch()
    return <AuthScreen mode="login" redirect={search.redirect} reason={search.reason} />
  },
})
