import { cn } from '@/shared/lib/cn'

/** Placeholder with shimmer (theme.css `skeleton` utility); static under prefers-reduced-motion. */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="skeleton" aria-hidden="true" className={cn('skeleton', className)} {...props} />
}

export { Skeleton }
