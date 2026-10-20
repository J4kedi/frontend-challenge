import type { ComponentProps } from 'react'
import { Input } from '@/components/ui/input'

/** "Nome ENS" of the Figma: fixed `.eth` domain + the name. Only `.eth` exists, so the select has one option. */
export function EnsInput(props: ComponentProps<'input'>) {
  return (
    <div className="flex gap-2">
      <select aria-label="Domínio ENS" className="h-10 w-20 shrink-0 rounded-sm border border-border bg-transparent px-2 text-body-sm text-foreground" defaultValue=".eth">
        <option value=".eth">.eth</option>
      </select>
      <Input {...props} autoComplete="off" placeholder="seunome" />
    </div>
  )
}
