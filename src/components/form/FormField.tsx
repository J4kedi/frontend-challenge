import { useId, type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

export interface FieldControlProps {
  id: string
  'aria-invalid': boolean | undefined
  'aria-describedby': string | undefined
  'aria-required': boolean | undefined
}

/**
 * Label + control + error, wired for assistive tech: the error is linked with
 * aria-describedby and the control gets aria-invalid. `hideLabel` keeps the
 * label for screen readers when the Figma only shows a placeholder.
 */
export function FormField({
  label,
  error,
  hint,
  required = false,
  hideLabel = false,
  className,
  children,
}: {
  label: string
  error?: string
  hint?: string
  required?: boolean
  hideLabel?: boolean
  className?: string
  children: (props: FieldControlProps) => ReactNode
}) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={id} className={cn('text-body-sm text-foreground', hideLabel && 'sr-only')}>
        {label}
        {required && (
          <span className="ml-0.5 text-coral" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy, 'aria-required': required || undefined })}
      {hint && !error && (
        <p id={hintId} className="text-caption text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-caption text-danger-text">
          {error}
        </p>
      )}
    </div>
  )
}

/** Form-level error (e.g. wrong credentials), announced when it appears. */
export function FormError({ message }: { message: string | null | undefined }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-sm border border-danger/60 bg-danger/10 px-3 py-2 text-body-sm text-danger-text">
      {message}
    </p>
  )
}
