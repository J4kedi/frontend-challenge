import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import { cn } from '@/shared/lib/cn'

/** shadcn Button restyled to the Figma buttons (docs/design/components.md#button). */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 font-bold whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-accent',
        outline: 'border border-primary bg-transparent text-accent hover:bg-surface',
        secondary: 'bg-surface-raised text-foreground hover:bg-surface-dark',
        ghost: 'text-foreground hover:bg-surface-raised',
        destructive: 'bg-danger text-white hover:bg-danger/90',
        link: 'text-accent underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 rounded-sm px-6 text-body-sm',
        sm: 'h-8 rounded-sm px-3 text-body-sm',
        lg: 'h-12 rounded-sm px-8 text-body-lg',
        pill: 'h-15 rounded-full px-8 text-body-lg',
        icon: 'size-9 rounded-sm',
        'icon-lg': 'size-12 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  type,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      // A plain button unless asked: inside a form, actions such as "Remover" must not submit it.
      type={asChild ? type : (type ?? 'button')}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
