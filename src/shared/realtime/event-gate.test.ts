import { describe, expect, it } from 'vitest'
import type { NftUpdatedEvent } from '@/contracts/events'
import { createEventGate } from './event-gate'

const nftEvent = (id: string, version: number): NftUpdatedEvent => ({
  id,
  type: 'nft.updated',
  version,
  occurredAt: '2026-10-20T12:00:00.000Z',
  resource: { type: 'nft', id: 'emerald-ape-042' },
  data: { priceEth: '1.19', previousPriceEth: null, available: 3, editions: [] },
})

describe('event gate', () => {
  it('applies newer versions in order', () => {
    const gate = createEventGate()
    expect(gate.accept(nftEvent('a', 2))).toBe(true)
    expect(gate.accept(nftEvent('b', 3))).toBe(true)
  })

  it('drops duplicates of the same event', () => {
    const gate = createEventGate()
    expect(gate.accept(nftEvent('a', 2))).toBe(true)
    expect(gate.accept(nftEvent('a', 2))).toBe(false)
  })

  it('drops events older than what was already applied', () => {
    const gate = createEventGate()
    expect(gate.accept(nftEvent('b', 3))).toBe(true)
    expect(gate.accept(nftEvent('a', 2))).toBe(false)
  })

  it('tracks versions per resource', () => {
    const gate = createEventGate()
    expect(gate.accept(nftEvent('a', 5))).toBe(true)
    expect(gate.accept({ ...nftEvent('b', 1), resource: { type: 'nft', id: 'other' } })).toBe(true)
  })
})
