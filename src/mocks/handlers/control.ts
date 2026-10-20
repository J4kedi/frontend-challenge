import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { ethAmount } from '@/contracts/common'
import { db, persist, resetDb } from '../db/store'
import { api, fail, readBody } from '../http'
import { dropConnections, lastEventSummary, nftUpdated, publish, replayLast } from '../realtime/server'
import { isScenario, SCENARIOS, scenario, setScenario } from '../scenarios'
import { findNft, toNftDetail } from '../views'

/**
 * Control API of the simulation (`/api/__mock/*`), used by the mock panel and
 * by the Playwright tests. Every change goes through the mock backend: the DB
 * is updated and the matching Socket.IO event is published, exactly as a real
 * server would do. No network conditions are applied here.
 */
const updateNftBody = z.object({
  editionId: z.string().optional(),
  priceEth: ethAmount.optional(),
  available: z.number().int().min(0).optional(),
})

export const controlHandlers = [
  http.get(api('/__mock/state'), () =>
    HttpResponse.json({ scenario: scenario(), scenarios: SCENARIOS, lastEvent: lastEventSummary() }),
  ),

  http.put(api('/__mock/scenario'), async ({ request }) => {
    const body = (await request.json().catch(() => null)) as { name?: string } | null
    const name = body?.name ?? null
    if (!isScenario(name)) return fail(422, 'VALIDATION_ERROR', 'Cenário desconhecido')
    setScenario(name)
    return HttpResponse.json({ scenario: name })
  }),

  http.post(api('/__mock/reset'), () => {
    resetDb()
    dropConnections()
    return HttpResponse.json({ ok: true })
  }),

  http.post(api('/__mock/nfts/:id'), async ({ request, params }) => {
    const nft = findNft(String(params.id))
    if (!nft) return fail(404, 'NOT_FOUND', 'NFT não encontrado')
    const body = await readBody(request, updateNftBody)
    if (body.error) return body.error
    const edition = nft.editions.find((e) => e.id === (body.data.editionId ?? nft.defaultEditionId))
    if (!edition) return fail(404, 'NOT_FOUND', 'Edição não encontrada')
    if (body.data.priceEth !== undefined && body.data.priceEth !== edition.priceEth) {
      if (edition.id === nft.defaultEditionId) nft.previousPriceEth = edition.priceEth
      edition.priceEth = body.data.priceEth
    }
    if (body.data.available !== undefined) edition.available = body.data.available
    nft.version += 1
    persist()
    publish(nftUpdated(nft))
    return HttpResponse.json(toNftDetail(nft))
  }),

  http.post(api('/__mock/session/expire'), () => {
    const sessions = db().sessions
    const past = new Date(Date.now() - 1000).toISOString()
    for (const session of sessions) session.expiresAt = past
    persist()
    return HttpResponse.json({ expired: sessions.length })
  }),

  // { seconds?: 0–60 }: how long the server refuses to come back.
  http.post(api('/__mock/socket/drop'), async ({ request }) => {
    const body = (await request.json().catch(() => null)) as { seconds?: unknown } | null
    const seconds = Math.min(Math.max(Number(body?.seconds) || 0, 0), 60)
    return HttpResponse.json(dropConnections(seconds))
  }),

  http.post(api('/__mock/events/replay'), async ({ request }) => {
    const body = (await request.json().catch(() => null)) as { mode?: string } | null
    const mode = body?.mode === 'stale' ? 'stale' : 'duplicate'
    const event = replayLast(mode)
    return HttpResponse.json({ replayed: event })
  }),
]
