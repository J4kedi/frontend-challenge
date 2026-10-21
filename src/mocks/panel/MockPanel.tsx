import { useQuery } from '@tanstack/react-query'
import { useRouter, useRouterState } from '@tanstack/react-router'
import { FlaskConicalIcon, XIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { mocksReady } from '@/app/transport'
import { safeRedirect, useLogin, useSession } from '@/features/auth/session'
import { useCart } from '@/features/cart/queries'
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/shared/config'
import { cn } from '@/shared/lib/cn'
import { addEth } from '@/shared/lib/money'
import { useRealtimeStatus } from '@/shared/realtime/RealtimeProvider'
import { sessionStore } from '@/shared/session/session-store'
import { SCENARIOS, scenario, type ScenarioName } from '../scenarios'

/**
 * Demo panel of the mock layer (bottom-left "Mocks" button). It only talks to
 * the control API (/api/__mock/*): every action changes the simulated backend,
 * which then answers over REST and publishes over Socket.IO like a real server.
 * Each action says what it will do, with the data it will touch.
 */
const API = import.meta.env.VITE_API_URL ?? '/api'
const DROP_SECONDS = [5, 10, 30] as const

interface LastEvent {
  type: string
  version: number
  subject: string
}

async function control<T = unknown>(path: string, body?: unknown, method = 'POST') {
  await mocksReady()
  const response = await fetch(`${API}/__mock${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`O mock recusou ${path} (${response.status})`)
  return response.json() as Promise<T>
}

export default function MockPanel() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<ScenarioName>(scenario())
  // Kept here so the countdown survives closing and reopening the panel.
  const [downUntil, setDownUntil] = useState(0)
  const status = useRealtimeStatus()
  const trigger = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  const close = () => {
    setOpen(false)
    trigger.current?.focus()
  }

  return (
    // On phones a dialog's own actions sit where the trigger is: it steps aside while one is open.
    <div
      data-mock-panel
      className="pointer-events-auto fixed bottom-28 left-2 z-60 flex flex-col items-start gap-2 max-md:[body:has([role=dialog])_&]:hidden max-md:[body:has([data-buy-bar])_&]:bottom-46 md:bottom-4 md:left-3"
    >
      {open && (
        <PanelContent
          id={panelId}
          active={active}
          onScenario={setActive}
          downUntil={downUntil}
          onDrop={setDownUntil}
          onClose={close}
        />
      )}
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full border border-primary bg-surface-raised px-3 py-1.5 text-caption font-bold text-accent shadow-raised hover:bg-surface md:px-4 md:py-2"
      >
        <FlaskConicalIcon className="size-4" aria-hidden="true" />
        <span className="sr-only md:not-sr-only">Mocks</span>
        <StatusDot status={status} />
        <span className="sr-only font-medium text-foreground md:not-sr-only">· {SCENARIOS[active].label}</span>
      </button>
    </div>
  )
}

function PanelContent({
  id,
  active,
  onScenario,
  downUntil,
  onDrop,
  onClose,
}: {
  id: string
  active: ScenarioName
  onScenario: (name: ScenarioName) => void
  downUntil: number
  onDrop: (until: number) => void
  onClose: () => void
}) {
  const panel = useRef<HTMLElement>(null)
  const [busy, setBusy] = useState(false)
  const [seconds, setSeconds] = useState<(typeof DROP_SECONDS)[number]>(10)
  const status = useRealtimeStatus()
  const now = useNow()
  const { user } = useSession()
  const login = useLogin()
  const router = useRouter()
  const location = useRouterState({ select: (s) => s.location })
  const line = useCart().data?.lines[0]
  const state = useQuery({
    queryKey: ['mock-panel', 'state'],
    queryFn: () => control<{ lastEvent: LastEvent | null }>('/state', undefined, 'GET'),
    refetchInterval: 1500,
  })
  const lastEvent = state.data?.lastEvent ?? null
  const secondsLeft = Math.ceil((downUntil - now) / 1000)

  useEffect(() => panel.current?.focus(), [])
  // Escape closes the panel from anywhere, unless a dialog of the app is the one being closed.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.querySelector('[role="dialog"]')) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // Busy actions ignore clicks instead of disabling the button, so keyboard focus stays where it was.
  async function run(action: () => Promise<string>) {
    if (busy) return
    setBusy(true)
    try {
      toast.success(await action())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha no comando do mock')
    } finally {
      setBusy(false)
      void state.refetch()
    }
  }

  async function changeScenario(name: ScenarioName) {
    await control('/scenario', { name }, 'PUT')
    onScenario(name)
    toast.info(`Cenário: ${SCENARIOS[name].label}. Vale a partir da próxima requisição.`)
  }

  async function signInAs(account: (typeof DEMO_ACCOUNTS)[number]) {
    await login.mutateAsync({ email: account.email, password: DEMO_PASSWORD })
    // On the login screens, continue to where the collector was headed.
    if (location.pathname === '/login' || location.pathname === '/signup') {
      void router.navigate({ href: safeRedirect((location.search as { redirect?: string }).redirect), replace: true })
    }
    return `Você entrou como ${account.name}.`
  }

  const statusText =
    status === 'online'
      ? 'Conectado ao Socket.IO simulado'
      : status === 'connecting'
        ? 'Conectando…'
        : secondsLeft > 0
          ? `Desconectado · o servidor volta em ${secondsLeft} s`
          : 'Desconectado · reconectando…'

  return (
    <section
      ref={panel}
      id={id}
      tabIndex={-1}
      aria-labelledby={`${id}-title`}
      aria-busy={busy}
      className="flex max-h-[calc(100dvh-9rem)] w-[min(24rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-lg border border-border-soft bg-surface-raised text-caption shadow-overlay outline-none"
    >
      <header className="flex items-start justify-between gap-3 border-b border-border-soft px-4 py-3">
        <div>
          <h2 id={`${id}-title`} className="text-body-sm font-bold text-foreground">
            Painel de mocks
          </h2>
          <p className="mt-0.5 text-muted-foreground">
            Backend simulado no navegador (MSW + Socket.IO). Cada ação passa pela API de controle, como num servidor real.
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar painel de mocks" className="grid size-7 shrink-0 place-items-center rounded-sm text-muted-foreground hover:text-accent">
          <XIcon className="size-4" aria-hidden="true" />
        </button>
      </header>

      <div className="overflow-y-auto">
        <Section title="Cenário">
          <label className="block space-y-1">
            <span className="sr-only">Cenário ativo</span>
            <select
              className="h-9 w-full rounded-sm border border-border-soft bg-surface px-2 text-caption text-foreground"
              value={active}
              onChange={(event) => void changeScenario(event.target.value as ScenarioName).catch(() => toast.error('Não foi possível trocar o cenário'))}
            >
              {(Object.keys(SCENARIOS) as ScenarioName[]).map((name) => (
                <option key={name} value={name}>
                  {SCENARIOS[name].label}
                </option>
              ))}
            </select>
          </label>
          <p className="text-muted-foreground">{SCENARIOS[active].description}</p>
        </Section>

        <Section title="Tempo real">
          <p className="flex items-center gap-2 text-foreground">
            <StatusDot status={status} />
            {statusText}
          </p>
          <label className="flex items-center justify-between gap-3 text-muted-foreground">
            Duração da queda
            <select
              className="h-8 rounded-sm border border-border-soft bg-surface px-2 text-caption text-foreground"
              value={seconds}
              onChange={(event) => setSeconds(Number(event.target.value) as (typeof DROP_SECONDS)[number])}
            >
              {DROP_SECONDS.map((value) => (
                <option key={value} value={value}>
                  {value} s
                </option>
              ))}
            </select>
          </label>
          <Action
            title={`Derrubar a conexão por ${seconds} s`}
            description="O servidor fecha o Socket.IO e recusa reconexões nesse intervalo. Eventos publicados enquanto isso se perdem; ao voltar, o app recarrega preços e pedidos pela API REST."
            onRun={() =>
              void run(async () => {
                await control('/socket/drop', { seconds })
                onDrop(Date.now() + seconds * 1000)
                return `Conexão derrubada. O servidor volta em ${seconds} s.`
              })
            }
          />
          <Action
            title="Reenviar o último evento"
            context={lastEvent ? `${lastEvent.type} · ${lastEvent.subject} · v${lastEvent.version}` : undefined}
            description={
              lastEvent
                ? 'Mesmo id e mesma versão: o app reconhece a duplicata e nada muda na tela.'
                : 'Nenhum evento publicado ainda. Altere um preço em "Carrinho", logo abaixo, para gerar um.'
            }
            disabled={!lastEvent}
            onRun={() =>
              void run(async () => {
                await control('/events/replay', { mode: 'duplicate' })
                return `Reenviado: ${lastEvent!.type} · ${lastEvent!.subject} · v${lastEvent!.version}.`
              })
            }
          />
          <Action
            title="Enviar uma versão antiga do último evento"
            context={lastEvent && lastEvent.version > 1 ? `${lastEvent.subject} · v${lastEvent.version - 1}` : undefined}
            description={
              lastEvent && lastEvent.version > 1
                ? 'Versão menor que a do cache: o app ignora, e o valor antigo não volta para a tela.'
                : 'Precisa de um evento na versão 2 ou maior. Altere um preço primeiro.'
            }
            disabled={!lastEvent || lastEvent.version <= 1}
            onRun={() =>
              void run(async () => {
                await control('/events/replay', { mode: 'stale' })
                return `Enviado: ${lastEvent!.subject} · v${lastEvent!.version - 1}, mais antiga que a do cache.`
              })
            }
          />
        </Section>

        <Section title="Carrinho">
          <p className={line ? 'text-foreground' : 'text-muted-foreground'}>
            {line
              ? `1º item: ${line.name} · ${line.editionLabel} · ${line.unitPriceEth} ETH`
              : 'Adicione um NFT ao carrinho para liberar estas ações.'}
          </p>
          <Action
            title={line ? `Subir o preço de ${line.name} para ${addEth(line.unitPriceEth, '0.1')} ETH` : 'Subir o preço do 1º item em 0,1 ETH'}
            description="O servidor muda o preço e publica nft.updated: carrinho e detalhe atualizam na hora, e o pagamento pede para confirmar o novo valor."
            disabled={!line}
            onRun={() =>
              void run(async () => {
                const next = addEth(line!.unitPriceEth, '0.1')
                await control(`/nfts/${encodeURIComponent(line!.nftId)}`, { editionId: line!.editionId, priceEth: next })
                return `${line!.name}: ${line!.unitPriceEth} → ${next} ETH. O servidor publicou nft.updated.`
              })
            }
          />
          <Action
            title={line ? `Esgotar ${line.name} (${line.editionLabel})` : 'Esgotar a edição do 1º item'}
            description="O estoque vai a zero e o servidor publica nft.updated: o carrinho bloqueia a compra e explica o motivo."
            disabled={!line}
            onRun={() =>
              void run(async () => {
                await control(`/nfts/${encodeURIComponent(line!.nftId)}`, { editionId: line!.editionId, available: 0 })
                return `${line!.name} (${line!.editionLabel}) esgotado. O servidor publicou nft.updated.`
              })
            }
          />
        </Section>

        <Section title="Conta">
          <p className="text-foreground">
            {user ? `${user.displayName} · ${user.email}` : 'Visitante · carrinho anônimo deste navegador'}
          </p>
          <p className="text-muted-foreground">
            {user
              ? 'Trocar de conta descarta antes o socket e o cache da conta atual, então nada vaza entre contas.'
              : `Login pela API simulada, senha ${DEMO_PASSWORD}. O carrinho de visitante é mesclado na conta.`}
          </p>
          {DEMO_ACCOUNTS.filter((account) => account.email !== user?.email).map((account) => (
            <Action
              key={account.email}
              title={`Entrar como ${account.name}`}
              context={account.email}
              onRun={() => void run(() => signInAs(account))}
            />
          ))}
          <Action
            title="Expirar a sessão no servidor"
            description={
              user
                ? 'O token deixa de valer. A próxima chamada autenticada recebe 401, e o app pede login de novo e volta para onde você estava.'
                : 'Entre com uma conta para testar a expiração.'
            }
            disabled={!user}
            onRun={() =>
              void run(async () => {
                await control('/session/expire')
                return 'Sessão expirada no servidor. A próxima chamada autenticada recebe 401.'
              })
            }
          />
        </Section>

        <Section title="Dados">
          <Action
            title="Restaurar os dados iniciais"
            description="Volta o seed determinístico (catálogo, contas, carrinhos e pedidos), encerra a sessão e recarrega a página."
            onRun={() =>
              void run(async () => {
                await control('/reset')
                sessionStore.set(null)
                window.location.reload()
                return 'Dados restaurados.'
              })
            }
          />
        </Section>
      </div>
    </section>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2 border-t border-border-soft px-4 py-3 first:border-t-0">
      <h3 className="text-tiny font-bold tracking-wide text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  )
}

/** A trigger that says what it will do: contextual title, optional data line, and the expected effect. */
function Action({
  title,
  context,
  description,
  disabled,
  onRun,
}: {
  title: string
  context?: string
  description?: string
  disabled?: boolean
  onRun: () => void
}) {
  // The name is the visible text (title, context and description), so speech
  // input users can say what they see (WCAG 2.5.3).
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onRun}
      className="group w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-left transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border-soft"
    >
      <span className="block font-bold text-foreground group-enabled:group-hover:text-accent">{title}</span>
      {context && <span className="mt-0.5 block font-medium text-secondary">{context}</span>}
      {description && <span className="mt-0.5 block text-muted-foreground">{description}</span>}
    </button>
  )
}

function StatusDot({ status }: { status: ReturnType<typeof useRealtimeStatus> }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block size-2 shrink-0 rounded-full',
        status === 'online' ? 'bg-success' : status === 'connecting' ? 'bg-amber' : 'animate-pulse bg-danger',
      )}
    />
  )
}

/** Re-renders every second, for the outage countdown. */
function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  return now
}
