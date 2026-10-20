import type { RealtimeEvent } from '@/contracts/events'

/**
 * Decides whether an incoming event may be applied: drops duplicates (same id)
 * and anything not newer than the last version seen for that resource, so a
 * late or replayed event can never move a resource back in time.
 */
export function createEventGate(maxIds = 500) {
  const seenIds = new Set<string>()
  const versions = new Map<string, number>()

  return {
    accept(event: RealtimeEvent): boolean {
      if (seenIds.has(event.id)) return false
      seenIds.add(event.id)
      if (seenIds.size > maxIds) seenIds.delete(seenIds.values().next().value!)
      const key = `${event.resource.type}:${event.resource.id}`
      if (event.version <= (versions.get(key) ?? 0)) return false
      versions.set(key, event.version)
      return true
    },
  }
}
