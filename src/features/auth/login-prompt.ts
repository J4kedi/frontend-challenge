import { useSyncExternalStore } from 'react'

/**
 * Sign-in asked for in the middle of an action (e.g. a visitor saving a
 * favorite). The login opens over the current page instead of navigating to
 * /login, and the interrupted action resumes once the collector is signed in.
 */
export interface LoginPromptRequest {
  /** Why sign-in is needed, shown as the dialog's description. */
  reason: string
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
