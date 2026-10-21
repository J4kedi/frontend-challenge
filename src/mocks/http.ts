import { delay, HttpResponse, type DefaultBodyType, type HttpResponseResolver, type PathParams } from 'msw'
import type { z } from 'zod'
import type { ErrorCode } from '@/contracts/common'
import { db, persist, stableHash } from './db/store'
import type { UserRecord } from './db/types'
import { scenario } from './scenarios'

export const API_BASE = import.meta.env.VITE_API_URL ?? '/api'
export const api = (path: string) => `${API_BASE}${path}`

export function fail(
  status: number,
  code: ErrorCode,
  message: string,
  extra: { fields?: Record<string, string>; retryable?: boolean; details?: unknown } = {},
) {
  return HttpResponse.json({ error: { code, message, ...extra } }, { status })
}

/** Parses a JSON body with the shared contract; invalid input becomes a 422 with per-field messages. */
export async function readBody<T extends z.ZodType>(request: Request, schema: T) {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return { error: fail(400, 'VALIDATION_ERROR', 'Corpo da requisição inválido') } as const
  }
  const result = schema.safeParse(raw)
  if (result.success) return { data: result.data as z.infer<T> } as const
  const fields: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_'
    fields[key] ??= issue.message
  }
  return { error: fail(422, 'VALIDATION_ERROR', 'Revise os campos destacados', { fields }) } as const
}

/** Resolves the bearer token to a user. Expired sessions answer 401 SESSION_EXPIRED. */
export function authenticate(request: Request): { user: UserRecord } | { error: Response } {
  const header = request.headers.get('Authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return { error: fail(401, 'UNAUTHENTICATED', 'Entre na sua conta para continuar') }
  const current = db()
  const session = current.sessions.find((s) => s.token === token)
  if (!session) return { error: fail(401, 'UNAUTHENTICATED', 'Sessão inválida. Entre novamente.') }
  if (Date.parse(session.expiresAt) <= Date.now()) {
    current.sessions = current.sessions.filter((s) => s.token !== token)
    persist()
    return { error: fail(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente para continuar.') }
  }
  const user = current.users.find((u) => u.id === session.userId)
  if (!user) return { error: fail(401, 'UNAUTHENTICATED', 'Sessão inválida. Entre novamente.') }
  return { user }
}

const attempts = new Map<string, number>()
let attemptsScenario: string | null = null

/** An address works on its own chain family: Solana, or the EVM networks (Ethereum, Polygon). */
export const sameChainFamily = (a: string, b: string) => (a === 'solana') === (b === 'solana')

function latencyFor(request: Request) {
  const active = scenario()
  const h = Number.parseInt(stableHash(`${request.method} ${request.url}`), 16)
  if (active === 'slow') return 1800 + (h % 800)
  if (active === 'jitter') return 30 + (h % 1470)
  return 60 + (h % 120)
}

/**
 * Network conditions of the active scenario, applied to every REST handler:
 * latency, offline and transient 5xx. Control routes (/__mock) skip it.
 */
export function withNetwork<P extends PathParams, B extends DefaultBodyType>(
  resolver: HttpResponseResolver<P, B>,
): HttpResponseResolver<P, B> {
  return async (info) => {
    const active = scenario()
    if (active === 'offline') return HttpResponse.error()
    await delay(latencyFor(info.request))
    // Turning a scenario on again starts its failures over.
    if (active !== attemptsScenario) {
      attempts.clear()
      attemptsScenario = active
    }
    if (active === 'http-5xx') {
      // Reads fail their 3 first tries. A write fails its first try only when
      // retrying it is safe: the order, with its idempotency key.
      const url = new URL(info.request.url)
      const read = info.request.method === 'GET'
      const idempotencyKey = info.request.headers.get('Idempotency-Key')
      const key = read ? url.pathname + url.search : idempotencyKey && `${info.request.method} ${url.pathname} ${idempotencyKey}`
      if (key) {
        const count = (attempts.get(key) ?? 0) + 1
        attempts.set(key, count)
        if (count <= (read ? 3 : 1)) {
          return fail(503, 'UNAVAILABLE', 'Serviço temporariamente indisponível. Tente novamente.', { retryable: true })
        }
      }
    }
    return resolver(info)
  }
}

export const now = () => new Date().toISOString()
