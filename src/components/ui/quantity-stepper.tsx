import { MinusIcon, PlusIcon } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

/**
 * − value + control of the Figma (detail, cart). Bounded by `min`/`max`; the
 * buttons are disabled at the limits and the value is announced on change.
 */
export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  label,
  disabled = false,
  size = 'md',
}: {
  value: number
  min?: number
  max: number
  onChange: (next: number) => void
  label: string
  disabled?: boolean
  size?: 'sm' | 'md'
}) {
  const button = cn(
    'grid place-items-center rounded-full bg-primary text-ink transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:bg-surface-raised disabled:text-muted-foreground',
    size === 'md' ? 'size-11' : 'size-6',
  )
  return (
    <div role="group" aria-label={label} className={cn('flex items-center', size === 'md' ? 'gap-4' : 'gap-3')}>
      <button
        type="button"
        className={button}
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= min}
        aria-label="Diminuir quantidade"
      >
        <MinusIcon className={size === 'md' ? 'size-5' : 'size-3.5'} aria-hidden="true" />
      </button>
      <output aria-live="polite" className={cn('min-w-6 text-center text-foreground', size === 'md' ? 'text-title-sm' : 'text-body-lg')}>
        {value}
      </output>
      <button
        type="button"
        className={button}
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max}
        aria-label="Aumentar quantidade"
      >
        <PlusIcon className={size === 'md' ? 'size-5' : 'size-3.5'} aria-hidden="true" />
      </button>
    </div>
  )
}
