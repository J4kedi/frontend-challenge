import { useSyncExternalStore, type MouseEvent } from 'react'
import { sessionStore } from '@/shared/session/session-store'

/**
 * Sign-in asked for from the page the collector is on (a visitor saving a
 * favorite, checking out the cart or pressing "Entrar"). The login opens over
 * the current page instead of navigating to /login, whose desktop backdrop is
 * the home page, and the interrupted action resumes once signed in.
 */
export interface LoginPromptRequest {
  /** Why sign-in is needed, shown as the dialog's description. Defaults to the form's intro. */
  reason?: string
  /** Runs once after a successful sign-in, on the same page. */
  onSignedIn?: () => void
}

let current: LoginPromptRequest | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())

export const loginPrompt = {
  open(request: LoginPromptRequest) {
    current = request
    emit()
  },
  close() {
    current = null
    emit()
  },
}

/**
 * onClick for a link that needs a session (/login, /checkout): a visitor's plain
 * click opens the login here instead. Signed-in collectors and modified clicks
 * (new tab) follow the link, which keeps working through the /login route.
 */
export const promptVisitor = (request: LoginPromptRequest) => (event: MouseEvent) => {
  if (sessionStore.token() || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  loginPrompt.open(request)
}

export function useLoginPrompt() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => current,
    () => current,
  )
}
