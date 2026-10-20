import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { AuthScreen } from '@/features/auth/AuthScreen'
import { safeRedirect } from '@/features/auth/session'
import { sessionStore } from '@/shared/session/session-store'

export const Route = createFileRoute('/signup')({
  validateSearch: z.object({ redirect: z.string().optional().catch(undefined) }),
  beforeLoad: ({ search }) => {
    if (sessionStore.token()) throw redirect({ href: safeRedirect(search.redirect) })
  },
  head: () => ({ meta: [{ title: 'Criar conta — Kurio' }] }),
  component: function SignupRoute() {
    const search = Route.useSearch()
    return <AuthScreen mode="signup" redirect={search.redirect} />
  },
})
