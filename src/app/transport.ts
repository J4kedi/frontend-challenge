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
