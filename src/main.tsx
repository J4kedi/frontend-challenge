import '@/styles/theme.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { toast } from 'sonner'
import { createQueryClient } from '@/app/query-client'
import { createAppRouter } from '@/app/router'
import { transportReady } from '@/app/transport'
import { signOutLocally } from '@/features/auth/session'
import { apiClient, setSessionExpiredHandler } from '@/shared/api/client'
import { config } from '@/shared/config'
import { RealtimeProvider } from '@/shared/realtime/RealtimeProvider'

const queryClient = createQueryClient()
const router = createAppRouter(queryClient)

if (config.mocksEnabled) {
  apiClient.interceptors.request.use(async (request) => {
    await transportReady
    return request
  })
}

setSessionExpiredHandler((code) => {
  signOutLocally(queryClient)
  const { pathname, href } = router.state.location
  if (pathname === '/login') return
  toast.error(
    code === 'SESSION_EXPIRED'
      ? 'Sua sessão expirou. Entre novamente para continuar de onde parou.'
      : 'Entre na sua conta para continuar.',
  )
  void router.navigate({
    to: '/login',
    search: { redirect: href, reason: code === 'SESSION_EXPIRED' ? 'expired' : undefined },
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
