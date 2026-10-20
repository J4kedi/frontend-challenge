export const config = {
  apiUrl: import.meta.env.VITE_API_URL ?? '/api',
  socketUrl: import.meta.env.VITE_SOCKET_URL ?? 'wss://realtime.kurio.mock',
  mocksEnabled: import.meta.env.VITE_ENABLE_MOCKS === 'true',
  mockPanel: import.meta.env.VITE_MOCK_PANEL === 'true',
  /** Axios timeout. Orders retry with the same idempotency key after it. */
  requestTimeoutMs: 8000,
} as const
