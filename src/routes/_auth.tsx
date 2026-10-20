import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { sessionQueryOptions } from '@/features/auth/session'
import { isApiError } from '@/shared/api/errors'
import { sessionStore } from '@/shared/session/session-store'

/** Private area: checkout, orders, profile, wallets and favorites. */
export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context, location }) => {
    const token = sessionStore.token()
    const session = token
      ? await context.queryClient.ensureQueryData(sessionQueryOptions(token)).catch((error: unknown) => {
          if (isApiError(error, 'SESSION_EXPIRED')) return 'expired' as const
          return null
        })
      : null
    if (!session || session === 'expired') {
      throw redirect({
        to: '/login',
        search: { redirect: location.href, reason: session === 'expired' ? 'expired' : undefined },
      })
    }
    return { user: session.user }
  },
  component: Outlet,
})
