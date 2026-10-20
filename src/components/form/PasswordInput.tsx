import { useState, type ComponentProps } from 'react'
import { HideIcon } from '@/components/icons'
import { Input } from '@/components/ui/input'
import { cn } from '@/shared/lib/cn'

/** Password field with the Figma eye toggle. */
export function PasswordInput({ className, ...props }: ComponentProps<'input'>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className={cn('pr-11', className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visible}
        className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-sm text-muted-foreground hover:text-accent"
      >
        <HideIcon className={cn('size-5', visible && 'opacity-50')} />
      </button>
    </div>
  )
}
