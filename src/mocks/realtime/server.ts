import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import type { NftUpdatedEvent, OrderUpdatedEvent, RealtimeEvent } from '@/contracts/events'
import { db, persist } from '../db/store'
import type { NftRecord, OrderRecord } from '../db/types'
import { scenario } from '../scenarios'

/**
 * Socket.IO server of the mock layer, on top of MSW WebSocket interception and
 * @mswjs/socket.io-binding 0.2.0. The binding covers the handshake and event
 * framing; three gaps are filled here:
 *  - it never pings, so Engine.IO clients would drop after ~30 s → we ping;
 *  - it has no broadcast → we keep the set of live peers;
 *  - it ignores the CONNECT auth payload → clients identify with a
 *    `session.subscribe` event, and only then receive their private events.
 */
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'wss://realtime.kurio.mock'

interface Peer {
  io: ReturnType<typeof toSocketIo>
  userId: string | null
  close: () => void
}

const peers = new Set<Peer>()
const realtime = ws.link(`${SOCKET_URL}/*`)

export const realtimeHandler = realtime.addEventListener('connection', (connection) => {
  const io = toSocketIo(connection)
  const peer: Peer = { io, userId: null, close: () => connection.client.close() }
  peers.add(peer)

  const ping = setInterval(() => connection.client.send('2'), 20_000)
  connection.client.addEventListener('close', () => {
    clearInterval(ping)
    peers.delete(peer)
  })

  io.client.on('session.subscribe', (_event, payload: { token?: string | null } | undefined) => {
    const token = payload?.token
    const session = token
      ? db().sessions.find((s) => s.token === token && Date.parse(s.expiresAt) > Date.now())
      : undefined
    peer.userId = session?.userId ?? null
    io.client.emit('session.subscribed', { userId: peer.userId })
  })
})

function deliver(event: RealtimeEvent) {
  for (const peer of peers) {
    if (event.type === 'order.updated' && peer.userId !== event.userId) continue
    peer.io.client.emit(event.type, event)
  }
}

/** A copy one version older, carrying the older values: clients must ignore it. */
function staleCopy(event: RealtimeEvent): RealtimeEvent | null {
  if (event.version <= 1) return null
  if (event.type === 'nft.updated') {
    const olderPrice = event.data.previousPriceEth ?? event.data.priceEth
    return { ...event, id: `${event.id}:stale`, version: event.version - 1, data: { ...event.data, priceEth: olderPrice } }
  }
  return { ...event, id: `${event.id}:stale`, version: event.version - 1, data: { ...event.data, status: 'pending' } }
}

export function publish(event: RealtimeEvent) {
  const current = db()
  current.events = [...current.events.slice(-29), event]
  persist()
  deliver(event)
  if (scenario() === 'events-chaos') {
    deliver(event)
    const stale = staleCopy(event)
    if (stale) deliver(stale)
  }
}

export function replayLast(mode: 'duplicate' | 'stale') {
  const last = db().events.at(-1)
  if (!last) return null
  const event = mode === 'duplicate' ? last : staleCopy(last)
  if (event) deliver(event)
  return event
}

/** Server-side disconnect of every peer; Socket.IO clients reconnect on their own. */
export function dropConnections() {
  const count = peers.size
  for (const peer of [...peers]) peer.close()
  return count
}

const eventId = () => `evt_${crypto.randomUUID()}`

export function nftUpdated(nft: NftRecord): NftUpdatedEvent {
  const edition = nft.editions.find((e) => e.id === nft.defaultEditionId) ?? nft.editions[0]!
  return {
    id: eventId(),
    type: 'nft.updated',
    version: nft.version,
    occurredAt: new Date().toISOString(),
    resource: { type: 'nft', id: nft.id },
    data: {
      priceEth: edition.priceEth,
      previousPriceEth: nft.previousPriceEth,
      available: edition.available,
      editions: nft.editions.map((e) => ({ id: e.id, priceEth: e.priceEth, available: e.available })),
    },
  }
}

export function orderUpdated(order: OrderRecord): OrderUpdatedEvent {
  return {
    id: eventId(),
    type: 'order.updated',
    version: order.version,
    occurredAt: new Date().toISOString(),
    resource: { type: 'order', id: order.id },
    userId: order.userId,
    data: { status: order.status, failureReason: order.failureReason, transaction: order.transaction },
  }
}
