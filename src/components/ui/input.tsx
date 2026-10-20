import * as React from 'react'
import { cn } from '@/shared/lib/cn'

/** Text field of the Figma forms: transparent fill, brown border, orange when focused. */
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-10 w-full min-w-0 rounded-sm border border-border bg-transparent px-3 text-body-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground',
        'focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-danger',
        'file:border-0 file:bg-transparent file:text-body-sm file:text-foreground',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
