import { HeadContent, Outlet } from '@tanstack/react-router'
import { WifiOffIcon } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { LiveRegion } from '@/shared/a11y/announcer'
import { config } from '@/shared/config'
import { useRealtimeStatus } from '@/shared/realtime/RealtimeProvider'
import { MobileTabBar } from './MobileTabBar'
import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'

const MockPanel = lazy(() => import('@/mocks/panel/MockPanel'))

export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col">
      <HeadContent />
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-sm bg-primary px-4 py-2 font-bold text-ink focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader />
      <RealtimeNotice />
      <main id="conteudo" tabIndex={-1} className="flex-1 pb-28 outline-none md:pb-0">
        <Outlet />
      </main>
      <SiteFooter />
      <MobileTabBar />
      {/* Bottom: toasts never cover the sticky header (desktop) and sit above the tab bar (mobile). */}
      <Toaster position="bottom-right" closeButton mobileOffset={{ bottom: 96 }} />
      <LiveRegion />
      {config.mocksEnabled && config.mockPanel && (
        <Suspense fallback={null}>
          <MockPanel />
        </Suspense>
      )}
    </div>
  )
}

/** Visible only while the realtime connection is down; prices may be stale until it comes back. */
function RealtimeNotice() {
  const status = useRealtimeStatus()
  if (status !== 'offline') return null
  return (
    <div role="status" className="bg-surface-dark px-4 py-2 text-center text-body-sm text-foreground">
      <WifiOffIcon className="mr-2 inline size-4 text-amber" aria-hidden="true" />
      Conexão em tempo real perdida. Reconectando… Preços e pedidos serão atualizados quando voltar.
    </div>
  )
}
