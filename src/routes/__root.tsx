import { createRootRouteWithContext } from '@tanstack/react-router'
import type { RouterContext } from '@/app/router'
import { NotFoundPage, RouteErrorPage } from '@/components/feedback/StatusPage'
import { AppShell } from '@/components/layout/AppShell'

export const Route = createRootRouteWithContext<RouterContext>()({
  component: AppShell,
  notFoundComponent: () => <NotFoundPage />,
  errorComponent: ({ error, reset }) => <RouteErrorPage error={error} reset={reset} />,
})
