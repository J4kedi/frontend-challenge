import { setupWorker } from 'msw/browser'
import { loadDb, resetDb } from './db/store'
import { accountHandlers } from './handlers/account'
import { authHandlers } from './handlers/auth'
import { catalogHandlers } from './handlers/catalog'
import { commerceHandlers, resumeSettlements } from './handlers/commerce'
import { controlHandlers } from './handlers/control'
import type { MockParams } from './params'
import { realtimeHandler } from './realtime/server'
import { restoreScenario, setScenario } from './scenarios'

export const handlers = [
  ...controlHandlers,
  ...authHandlers,
  ...catalogHandlers,
  ...accountHandlers,
  ...commerceHandlers,
  realtimeHandler,
]

/**
 * Boots the simulated backend: restores (or resets) the persisted DB, applies
 * the requested scenario and starts the service worker plus the WebSocket
 * interception. Resolves once requests and sockets are intercepted.
 */
export async function startMocks(params: MockParams) {
  restoreScenario()
  if (params.scenario) setScenario(params.scenario)
  else if (params.reset) setScenario('default')
  if (params.reset) resetDb()
  else loadDb()

  const worker = setupWorker(...handlers)
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
    serviceWorker: { url: '/mockServiceWorker.js' },
  })
  resumeSettlements()
}
