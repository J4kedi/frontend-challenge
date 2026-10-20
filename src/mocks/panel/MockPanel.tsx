import { useState } from 'react'
import { toast } from 'sonner'
import { cart as cartSchema } from '@/contracts/commerce'
import { addEth } from '@/shared/lib/money'
import { guestCartId, sessionStore } from '@/shared/session/session-store'
import { SCENARIOS, scenario, type ScenarioName } from '../scenarios'

/**
 * Demo panel of the mock layer (bottom-left "Mocks" button). It only talks to
 * the control API (/api/__mock/*): every trigger changes the simulated backend,
 * which then answers over REST and publishes over Socket.IO like a real server.
 */
const API = import.meta.env.VITE_API_URL ?? '/api'

async function control(path: string, body?: unknown) {
  const response = await fetch(`${API}/__mock${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`${path} → ${response.status}`)
  return response.json() as Promise<unknown>
}

async function firstCartLine() {
  const token = sessionStore.token()
  const response = await fetch(`${API}/cart`, {
    headers: { 'X-Cart-Id': guestCartId(), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
  const parsed = cartSchema.safeParse(await response.json())
  return parsed.success ? parsed.data.lines[0] : undefined
}

export default function MockPanel() {
  const [active, setActive] = useState<ScenarioName>(scenario())
  const [busy, setBusy] = useState(false)

  async function run(label: string, action: () => Promise<unknown>) {
    setBusy(true)
    try {
      await action()
      toast.success(label)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha no comando do mock')
    } finally {
      setBusy(false)
    }
  }

  async function changeScenario(name: ScenarioName) {
    await fetch(`${API}/__mock/scenario`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setActive(name)
    toast.info(`Cenário: ${SCENARIOS[name].label}`)
  }

  async function changeFirstLine(kind: 'price' | 'stock') {
    const line = await firstCartLine()
    if (!line) throw new Error('Adicione um NFT ao carrinho primeiro')
    return control(`/nfts/${encodeURIComponent(line.nftId)}`, {
      editionId: line.editionId,
      ...(kind === 'price' ? { priceEth: addEth(line.unitPriceEth, '0.1') } : { available: 0 }),
    })
  }

  const button =
    'w-full rounded-sm border border-border-soft px-3 py-2 text-left text-caption text-foreground hover:border-primary disabled:opacity-50'

  return (
    <details className="fixed bottom-24 left-3 z-50 max-w-72 text-caption md:bottom-4">
      <summary className="cursor-pointer list-none rounded-full border border-primary bg-surface-raised px-4 py-2 font-bold text-accent shadow-raised">
        Mocks · {SCENARIOS[active].label}
      </summary>
      <div className="mt-2 max-h-[70vh] space-y-3 overflow-y-auto rounded-lg border border-border-soft bg-surface-raised p-3 shadow-raised">
        <label className="block space-y-1">
          <span className="font-bold text-foreground">Cenário</span>
          <select
            className="w-full rounded-sm border border-border-soft bg-surface px-2 py-1.5 text-foreground"
            value={active}
            onChange={(e) => void changeScenario(e.target.value as ScenarioName)}
          >
            {(Object.keys(SCENARIOS) as ScenarioName[]).map((name) => (
              <option key={name} value={name}>
                {SCENARIOS[name].label}
              </option>
            ))}
          </select>
          <span className="block text-muted-foreground">{SCENARIOS[active].description}</span>
        </label>
        <div className="space-y-1.5">
          <p className="font-bold text-foreground">Tempo real</p>
          <button type="button" className={button} disabled={busy} onClick={() => void run('Preço alterado (+0,1 ETH)', () => changeFirstLine('price'))}>
            Alterar preço do 1º item do carrinho
          </button>
          <button type="button" className={button} disabled={busy} onClick={() => void run('Edição esgotada', () => changeFirstLine('stock'))}>
            Esgotar a edição do 1º item do carrinho
          </button>
          <button type="button" className={button} disabled={busy} onClick={() => void run('Conexão derrubada', () => control('/socket/drop'))}>
            Derrubar a conexão Socket.IO
          </button>
          <button type="button" className={button} disabled={busy} onClick={() => void run('Evento reenviado', () => control('/events/replay', { mode: 'duplicate' }))}>
            Reenviar o último evento (duplicado)
          </button>
          <button type="button" className={button} disabled={busy} onClick={() => void run('Evento antigo enviado', () => control('/events/replay', { mode: 'stale' }))}>
            Enviar versão antiga do último evento
          </button>
        </div>
        <div className="space-y-1.5">
          <p className="font-bold text-foreground">Sessão e dados</p>
          <button type="button" className={button} disabled={busy} onClick={() => void run('Sessões expiradas', () => control('/session/expire'))}>
            Expirar a sessão agora
          </button>
          <button
            type="button"
            className={button}
            disabled={busy}
            onClick={() =>
              void run('Dados restaurados', async () => {
                await control('/reset')
                sessionStore.set(null)
                window.location.reload()
              })
            }
          >
            Resetar todos os dados do mock
          </button>
        </div>
      </div>
    </details>
  )
}
