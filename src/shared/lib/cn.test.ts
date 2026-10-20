import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('keeps a text color next to a Figma font-size token', () => {
    expect(cn('text-primary-foreground', 'text-body-sm')).toBe('text-primary-foreground text-body-sm')
  })

  it('still resolves real conflicts', () => {
    expect(cn('text-body-sm', 'text-title')).toBe('text-title')
    expect(cn('text-foreground', 'text-accent')).toBe('text-accent')
  })
})
