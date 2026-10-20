import axios, { type AxiosRequestConfig } from 'axios'
import type { z } from 'zod'
import { config } from '@/shared/config'
import { guestCartId, sessionStore } from '@/shared/session/session-store'
import { ApiError, toApiError } from './errors'

/**
 * The only HTTP client of the app. Every REST call goes through `request`,
 * which validates the response against the shared zod contract, so the UI
 * only ever sees typed data or an ApiError.
 */
export const apiClient = axios.create({
  baseURL: config.apiUrl,
  timeout: config.requestTimeoutMs,
  // collection=a&collection=b, the format the API expects for repeated filters
  paramsSerializer: { indexes: null },
})

type ExpiredHandler = (code: 'SESSION_EXPIRED' | 'UNAUTHENTICATED') => void
let onSessionExpired: ExpiredHandler = () => {}

/** Registered by the app shell: clears private state and sends the user to login. */
export function setSessionExpiredHandler(handler: ExpiredHandler) {
  onSessionExpired = handler
}

const SENT_TOKEN = Symbol('sentToken')

apiClient.interceptors.request.use((request) => {
  const token = sessionStore.token()
  if (token) request.headers.set('Authorization', `Bearer ${token}`)
  request.headers.set('X-Cart-Id', guestCartId())
  ;(request as unknown as Record<symbol, string | null>)[SENT_TOKEN] = token
  return request
})

apiClient.interceptors.response.use(undefined, (error: unknown) => {
  const apiError = toApiError(error)
  const sentToken = (error as { config?: Record<symbol, string | null> }).config?.[SENT_TOKEN]
  // A 401 only ends the session that made the request; a late answer for an
  // older session must not log out the user who is signed in now.
  if (
    apiError.status === 401 &&
    sentToken &&
    sentToken === sessionStore.token() &&
    (apiError.code === 'SESSION_EXPIRED' || apiError.code === 'UNAUTHENTICATED')
  ) {
    onSessionExpired(apiError.code)
  }
  return Promise.reject(apiError)
})

export async function request<S extends z.ZodType>(schema: S, options: AxiosRequestConfig): Promise<z.infer<S>> {
  const response = await apiClient.request(options)
  const parsed = schema.safeParse(response.data)
  if (!parsed.success) {
    throw new ApiError(response.status, 'CONTRACT_MISMATCH', 'Resposta inesperada do servidor.', {}, false, parsed.error.issues)
  }
  return parsed.data
}

/** For endpoints that answer 204 No Content. */
export async function send(options: AxiosRequestConfig): Promise<void> {
  await apiClient.request(options)
}
