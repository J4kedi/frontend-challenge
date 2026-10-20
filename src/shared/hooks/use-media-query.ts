import { useSyncExternalStore } from 'react'

/** Matches a CSS media query and follows its changes. */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

export const DESKTOP_QUERY = '(min-width: 768px)'
