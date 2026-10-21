import { takeMockParams } from '@/mocks/params'
import { config } from '@/shared/config'

/**
 * Mock layer start-up (VITE_ENABLE_MOCKS). This module is imported first by
 * src/boot.ts, so the MSW chunk downloads and evaluates in parallel with the
 * application bundle instead of after it. REST calls wait for this promise
 * (interceptor in main.tsx) and the socket is created only after it resolves.
 */
export const transportReady: Promise<void> = config.mocksEnabled
  ? (() => {
      const params = takeMockParams()
      return import('@/mocks/browser')
        .then(({ startMocks }) => startMocks(params))
        .then(() => {
          // E2E tests wait for this flag before talking to the mock backend.
          document.documentElement.dataset.mocks = 'ready'
        })
        .catch((error: unknown) => console.error('Mock layer failed to start', error))
    })()
  : Promise.resolve()

/** Chrome stops a service worker after 30 s without events. */
const IDLE_MS = 20_000
let lastRequestAt = Date.now()
let registering: Promise<void> | null = null

/**
 * Resolves when a request to the mock API can go out. MSW's worker keeps the
 * tabs it serves only in memory: once the browser stops it for being idle (a
 * tab left open, in the background, a locked screen), the restarted worker
 * lets every request through to the host, which answers 404. After a quiet
 * period, this tab registers again with MOCK_ACTIVATE, the message MSW itself
 * sends on start, before the request goes out.
 */
export async function mocksReady(): Promise<void> {
  await transportReady
  const idle = Date.now() - lastRequestAt > IDLE_MS
  lastRequestAt = Date.now()
  const worker = navigator.serviceWorker?.controller
  if (idle && worker) registering ??= register(worker).finally(() => (registering = null))
  await registering
}

const register = (worker: ServiceWorker) =>
  new Promise<void>((resolve) => {
    const done = () => {
      navigator.serviceWorker.removeEventListener('message', onMessage)
      clearTimeout(timeout)
      resolve()
    }
    const onMessage = (event: MessageEvent<{ type?: string } | null>) => {
      if (event.data?.type === 'MOCKING_ENABLED') done()
    }
    const timeout = setTimeout(done, 2000)
    navigator.serviceWorker.addEventListener('message', onMessage)
    worker.postMessage('MOCK_ACTIVATE')
  })
