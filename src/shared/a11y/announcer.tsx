import { useSyncExternalStore } from 'react'

/**
 * One polite live region for the whole app. Mutations and realtime changes
 * call `announce`, screen readers read it, sighted users get a toast or an
 * inline notice from the component itself.
 */
let message = ''
let counter = 0
const listeners = new Set<() => void>()

export function announce(text: string) {
  counter += 1
  // A zero-width suffix forces re-announcement of identical messages.
  message = `${text}${'​'.repeat(counter % 2)}`
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function LiveRegion() {
  const text = useSyncExternalStore(subscribe, () => message, () => message)
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" data-testid="live-region">
      {text}
    </div>
  )
}
