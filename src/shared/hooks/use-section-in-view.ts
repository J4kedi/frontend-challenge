import { useEffect, useState } from 'react'

/**
 * Scroll-spy: true while the element with `id` crosses the middle of the
 * viewport. Used by the header to mark "Mercado" while the market section is
 * on screen, and "Início" above it.
 */
export function useSectionInView(id: string, enabled: boolean) {
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (!enabled) return
    const element = document.getElementById(id)
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => setInView(Boolean(entry?.isIntersecting)), {
      rootMargin: '-45% 0px -55% 0px',
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [id, enabled])

  return enabled && inView
}

/** Smooth scrolling, unless the user asked for reduced motion. */
export const scrollBehavior = (): ScrollBehavior =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
