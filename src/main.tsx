import '@/styles/theme.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { toast } from 'sonner'
import { createQueryClient } from '@/app/query-client'
import { createAppRouter } from '@/app/router'
import { mocksReady, transportReady } from '@/app/transport'
import { loginPrompt } from '@/features/auth/login-prompt'
import { signOutLocally } from '@/features/auth/session'
import { apiClient, setSessionExpiredHandler } from '@/shared/api/client'
import { config } from '@/shared/config'
import { RealtimeProvider } from '@/shared/realtime/RealtimeProvider'

const queryClient = createQueryClient()
const router = createAppRouter(queryClient)

if (config.mocksEnabled) {
  apiClient.interceptors.request.use(async (request) => {
    await mocksReady()
    return request
  })
}

setSessionExpiredHandler((code) => {
  signOutLocally(queryClient, code === 'SESSION_EXPIRED' ? 'expired' : undefined)
  const { pathname, href } = router.state.location
  if (pathname === '/login') return
  const message =
    code === 'SESSION_EXPIRED' ? 'Sua sessão expirou. Entre novamente para continuar de onde parou.' : 'Entre na sua conta para continuar.'
  // Matched from the URL: on a first load the router state has no matches yet.
  const privatePage = router.matchRoutes(router.state.location).some((match) => match.routeId === '/_auth')
  // A public page still works without a session: the login opens over it, as for visitors.
  if (!privatePage) {
    loginPrompt.open({ reason: message })
    return
  }
  toast.error(message)
  void router.navigate({
    to: '/login',
    search: { redirect: href, reason: code === 'SESSION_EXPIRED' ? 'expired' : undefined },
    // The private page left in history would send "back" (closing the login) straight to the login again.
    replace: true,
  })
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RealtimeProvider transportReady={transportReady} />
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
