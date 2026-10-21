import { createFileRoute, Outlet, redirect, useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { RouteErrorPage } from '@/components/feedback/StatusPage'
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
          if (isApiError(error) && error.status === 401) return null
          // Network or server failure: the session may be fine. Sending the collector
          // to /login would bounce straight back here, since a token is stored.
          throw error
        })
      : null
    if (!session || session === 'expired') {
      throw redirect({
        to: '/login',
        // A request that saw the session expire may have dropped the token before this check ran.
        search: { redirect: location.href, reason: session === 'expired' || (!token && sessionStore.expired()) ? 'expired' : undefined },
      })
    }
    return { user: session.user }
  },
  component: Outlet,
  errorComponent: AuthError,
})

/** "Tentar novamente" runs the session check again. */
function AuthError({ error }: ErrorComponentProps) {
  const router = useRouter()
  return <RouteErrorPage error={error} reset={() => void router.invalidate()} />
}
