import { http, HttpResponse } from 'msw'
import { loginBody, signupBody } from '@/contracts/account'
import { hashPassword, verifyPassword } from '../db/password'
import { db, nextId, persist } from '../db/store'
import type { UserRecord } from '../db/types'
import { api, authenticate, fail, now, readBody, withNetwork } from '../http'
import { toUser } from '../views'

export const SESSION_TTL_MS = 30 * 60_000

function openSession(user: UserRecord) {
  const session = {
    token: `tok_${crypto.randomUUID().replaceAll('-', '')}`,
    userId: user.id,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  }
  db().sessions.push(session)
  persist()
  return { token: session.token, expiresAt: session.expiresAt, user: toUser(user) }
}


export const authHandlers = [
  http.post(
    api('/auth/signup'),
    withNetwork(async ({ request }) => {
      const body = await readBody(request, signupBody)
      if (body.error) return body.error
      const { username, email, password } = body.data
      const normalized = email.toLowerCase()
      if (db().users.some((u) => u.email === normalized)) {
        return fail(409, 'EMAIL_TAKEN', 'Já existe uma conta com este e-mail', {
          fields: { email: 'Este e-mail já está cadastrado. Entre ou use outro e-mail.' },
        })
      }
      if (db().users.some((u) => u.username === username)) {
        return fail(409, 'USERNAME_TAKEN', 'Este nome de usuário já está em uso', {
          fields: { username: 'Nome de usuário já em uso. Escolha outro.' },
        })
      }
      const { salt, hash } = await hashPassword(password)
      const user: UserRecord = {
        id: nextId('usr'),
        displayName: username,
        username,
        email: normalized,
        ensName: username.replace(/[^a-z0-9-]/g, '').padEnd(3, '0'),
        walletNickname: 'Minha carteira',
        avatarUrl: null,
        passwordSalt: salt,
        passwordHash: hash,
        updatedAt: now(),
      }
      db().users.push(user)
      db().favorites[user.id] = []
      return HttpResponse.json(openSession(user), { status: 201 })
    }),
  ),

  http.post(
    api('/auth/login'),
    withNetwork(async ({ request }) => {
      const body = await readBody(request, loginBody)
      if (body.error) return body.error
      const user = db().users.find((u) => u.email === body.data.email.toLowerCase())
      const valid = user && (await verifyPassword(body.data.password, user.passwordSalt, user.passwordHash))
      if (!user || !valid) return fail(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos')
      return HttpResponse.json(openSession(user))
    }),
  ),

  http.get(
    api('/auth/session'),
    withNetwork(({ request }) => {
      const auth = authenticate(request)
      if ('error' in auth) return auth.error
      const token = request.headers.get('Authorization')!.slice(7)
      const session = db().sessions.find((s) => s.token === token)!
      return HttpResponse.json({ token, expiresAt: session.expiresAt, user: toUser(auth.user) })
    }),
  ),

  http.post(
    api('/auth/logout'),
    withNetwork(({ request }) => {
      const token = request.headers.get('Authorization')?.slice(7)
      db().sessions = db().sessions.filter((s) => s.token !== token)
      persist()
      return new HttpResponse(null, { status: 204 })
    }),
  ),
]
