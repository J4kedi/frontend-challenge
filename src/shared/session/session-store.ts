import { useSyncExternalStore } from 'react'

/**
 * Client-side session: the opaque bearer token and its owner, persisted so the
 * session survives a refresh. The user's data itself is server state
 * (GET /auth/session) and lives in TanStack Query, never here.
 *
 * Trade-off (ARCHITECTURE.md, "Sessão"): a real backend would use an HttpOnly
 * cookie; the mock layer runs in the page, so a bearer token is the honest choice.
 */
export interface StoredSession {
  token: string
  userId: string
  expiresAt: string
}

const SESSION_KEY = 'kurio:session'
const CART_KEY = 'kurio:cart-id'

function read(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as StoredSession) : null
  } catch {
    return null
  }
}

let current = read()
const listeners = new Set<() => void>()

export const sessionStore = {
  get: () => current,
  token: () => current?.token ?? null,
  userId: () => current?.userId ?? null,
  set(next: StoredSession | null) {
    current = next
    try {
      if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next))
      else localStorage.removeItem(SESSION_KEY)
    } catch {
      // storage blocked: the session lasts for this page only
    }
    listeners.forEach((listener) => listener())
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

// Signing in, out or as someone else in another tab changes who this tab is:
// reload, so no screen keeps showing (or sending) the previous user's data.
window.addEventListener('storage', (event) => {
  if (event.key !== SESSION_KEY) return
  const next = read()
  if (next?.userId !== current?.userId) return window.location.reload()
  current = next
  listeners.forEach((listener) => listener())
})

export function useStoredSession() {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.get, sessionStore.get)
}

/** Anonymous cart id of this browser. The visitor's cart lives on the server under this id. */
export function guestCartId() {
  try {
    let id = localStorage.getItem(CART_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(CART_KEY, id)
    }
    return id
  } catch {
    return 'guest-without-storage'
  }
}

/** After the guest cart is merged into the account, the visitor starts a fresh one. */
export function rotateGuestCartId() {
  try {
    localStorage.setItem(CART_KEY, crypto.randomUUID())
  } catch {
    // nothing to rotate
  }
}
