import { createSeed } from './seed'
import type { MockDb } from './types'

/**
 * State of the simulated backend. It lives in memory and is mirrored to
 * localStorage after every mutation, so a refresh keeps carts, orders and
 * profiles. `resetDb` restores the known seed in full.
 */
const STORAGE_KEY = 'kurio:mockdb:v1'

let state: MockDb | null = null

function read(): MockDb | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as MockDb
    return parsed.schema === 1 ? parsed : null
  } catch {
    return null
  }
}

export function loadDb() {
  state = read() ?? createSeed()
  persist()
}

export function resetDb() {
  state = createSeed()
  persist()
}

export function db(): MockDb {
  if (!state) loadDb()
  return state!
}

// Every tab of the demo runs its own copy of the simulated backend over the same
// localStorage: take the other tabs' writes, or the last tab to write would erase
// orders and carts the others created.
window.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY) return
  state = event.newValue ? (JSON.parse(event.newValue) as MockDb) : null
})

/** Takes the latest state any tab wrote, before its storage event arrives here. */
export function refreshDb() {
  state = read() ?? state
}

export function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage full or blocked: the mock keeps working in memory for this tab.
  }
}

export function nextId(prefix: string) {
  const current = db()
  current.seq += 1
  return `${prefix}_${current.seq.toString(36)}`
}

/** FNV-1a: short stable hash for quote ids and idempotency payload checks. */
export function stableHash(value: unknown) {
  const text = JSON.stringify(value)
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}
