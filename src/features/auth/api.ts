import { session, type LoginBody, type SignupBody } from '@/contracts/account'
import { request, send } from '@/shared/api/client'

export const authApi = {
  login: (body: LoginBody) => request(session, { method: 'POST', url: '/auth/login', data: body }),
  signup: (body: SignupBody) => request(session, { method: 'POST', url: '/auth/signup', data: body }),
  session: (signal?: AbortSignal) => request(session, { url: '/auth/session', signal }),
  logout: () => send({ method: 'POST', url: '/auth/logout' }),
}
