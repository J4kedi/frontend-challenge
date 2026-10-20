import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useSyncExternalStore } from 'react'
import type { Socket } from 'socket.io-client'
import { toast } from 'sonner'
import { REALTIME_EVENT_TYPES, realtimeEvent } from '@/contracts/events'
import { config } from '@/shared/config'
import { useStoredSession } from '@/shared/session/session-store'
import { applyEvent } from './apply-event'
import { createEventGate } from './event-gate'

type Status = 'connecting' | 'online' | 'offline'
let status: Status = 'connecting'
const listeners = new Set<() => void>()
const setStatus = (next: Status) => {
  status = next
  listeners.forEach((l) => l())
}

export function useRealtimeStatus() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => status,
    () => status,
  )
}

/**
 * Owns the Socket.IO connection. One socket per session: when the user logs in,
 * out or switches accounts, the previous socket and all its listeners are torn
 * down before a new one subscribes, so events of a previous session never
 * reach the next user. After a reconnection, active queries are refetched to
 * reconcile whatever was missed while offline.
 */
export function RealtimeProvider({ transportReady }: { transportReady: Promise<void> }) {
  const queryClient = useQueryClient()
  const session = useStoredSession()
  const token = session?.token ?? null
  const userId = session?.userId ?? null

  useEffect(() => {
    let socket: Socket | null = null
    let cancelled = false
    const gate = createEventGate()

    void transportReady.then(async () => {
      // Imported only now: socket.io-client captures the WebSocket constructor
      // at import time, and the mock layer must have patched it first.
      const { io } = await import('socket.io-client')
      if (cancelled) return
      socket = io(config.socketUrl, {
        transports: ['websocket'],
        reconnectionDelay: 500,
        reconnectionDelayMax: 2000,
        randomizationFactor: 0,
      })
      let hasConnected = false
      socket.on('connect', () => {
        socket?.emit('session.subscribe', { token })
        if (hasConnected) {
          void queryClient.invalidateQueries({
            predicate: (q) => ['nfts', 'user', 'guest'].includes(String(q.queryKey[0])),
            refetchType: 'active',
          })
          toast.success('Conexão em tempo real restabelecida. Sincronizando preços e pedidos.', { id: 'realtime-back' })
        }
        hasConnected = true
        setStatus('online')
      })
      socket.on('disconnect', () => setStatus('offline'))
      for (const type of REALTIME_EVENT_TYPES) {
        socket.on(type, (payload: unknown) => {
          const parsed = realtimeEvent.safeParse(payload)
          if (parsed.success && gate.accept(parsed.data)) applyEvent(queryClient, parsed.data, userId)
        })
      }
    })

    return () => {
      cancelled = true
      socket?.removeAllListeners()
      socket?.disconnect()
      setStatus('connecting')
    }
  }, [queryClient, token, userId, transportReady])

  return null
}
