/**
 * Mock scenarios. One is active at a time; it is chosen with `?scenario=<name>`
 * (kept across reloads) or from the mock panel. `?mock-reset` restores the seed.
 * Everything is deterministic: latencies come from a hash of the request, not
 * from Math.random, so the same run produces the same timings.
 */
export const SCENARIOS = {
  default: { label: 'Padrão', description: 'Latência curta (60–180 ms), tudo funciona.' },
  slow: { label: 'Rede lenta', description: 'Toda resposta leva 1,8–2,6 s: mostra skeletons e estados de carregamento.' },
  jitter: {
    label: 'Latência variável',
    description: 'Latência de 30 ms a 1,5 s por requisição: respostas chegam fora de ordem.',
  },
  offline: { label: 'Sem conexão', description: 'Toda chamada à API falha como erro de rede.' },
  'http-5xx': {
    label: 'Falha 503',
    description: 'Cada GET falha com 503 nas 3 primeiras tentativas e funciona na seguinte (testa o "Tentar novamente").',
  },
  'mutation-error': {
    label: 'Falha em mutation',
    description: 'Favoritar e desfavoritar respondem 500: a atualização otimista faz rollback.',
  },
  empty: { label: 'Catálogo vazio', description: 'A busca do catálogo não retorna nenhum NFT.' },
  'order-timeout': {
    label: 'Timeout no pedido',
    description: 'O primeiro POST do pedido cria o pedido mas só responde depois do timeout do cliente; o reenvio com a mesma chave recupera o mesmo pedido.',
  },
  'payment-declined': { label: 'Pagamento recusado', description: 'A rede simulada recusa o pagamento do pedido.' },
  'wallet-rejected': { label: 'Carteira recusa', description: 'A conexão com a carteira é recusada.' },
  'events-chaos': {
    label: 'Eventos duplicados e antigos',
    description: 'Todo evento Socket.IO chega duplicado e seguido de uma versão antiga.',
  },
} as const

export type ScenarioName = keyof typeof SCENARIOS

const STORAGE_KEY = 'kurio:mock-scenario'

export const isScenario = (value: string | null): value is ScenarioName =>
  value !== null && Object.hasOwn(SCENARIOS, value)

let active: ScenarioName = 'default'

export function scenario(): ScenarioName {
  return active
}

export function setScenario(name: ScenarioName) {
  active = name
  try {
    localStorage.setItem(STORAGE_KEY, name)
  } catch {
    // blocked storage: the scenario still applies to this page
  }
}

export function restoreScenario() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isScenario(saved)) active = saved
  } catch {
    active = 'default'
  }
}
