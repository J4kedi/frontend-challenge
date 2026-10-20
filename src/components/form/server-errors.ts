import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { isApiError } from '@/shared/api/errors'

/**
 * Maps an API error onto the form: per-field messages go to their fields (and
 * focus the first one); anything else is returned as the form-level message.
 */
export function applyServerErrors<T extends FieldValues>(form: UseFormReturn<T>, error: unknown, fields: readonly Path<T>[]) {
  if (!isApiError(error)) return 'Algo deu errado. Tente novamente.'
  const known = Object.entries(error.fields).filter(([name]) => (fields as readonly string[]).includes(name))
  known.forEach(([name, message], index) => form.setError(name as Path<T>, { type: 'server', message }, { shouldFocus: index === 0 }))
  return known.length ? null : error.message
}
