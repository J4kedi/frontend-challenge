# Contratos de tempo real (Socket.IO)

Última revisão: 2026-10-20

Fonte de verdade: [`src/contracts/events.ts`](../../src/contracts/events.ts).
Do lado do servidor simulado: [`src/mocks/realtime/server.ts`](../../src/mocks/realtime/server.ts).
Do lado do cliente: [`src/shared/realtime/`](../../src/shared/realtime/).

## Conexão

- Cliente: `socket.io-client` 4.8 em `VITE_SOCKET_URL` (padrão `wss://realtime.kurio.mock`), `transports: ['websocket']` e reconexão com `randomizationFactor: 0`, para ser determinístico.
- Um socket por sessão. Depois de conectar, o cliente envia `session.subscribe` com `{ token }` (ou `null` para visitante), e o servidor responde `session.subscribed` com `{ userId }`.
- Logout ou troca de usuário desconecta o socket, remove os listeners e abre outro com o novo token. Eventos de uma sessão anterior não chegam à seguinte.

## Envelope

```ts
{
  id: string           // identidade do evento: duplicatas têm o mesmo id
  type: 'nft.updated' | 'order.updated'
  resource: { type: 'nft' | 'order'; id: string }
  version: number      // versão do recurso DEPOIS da mudança
  occurredAt: string   // ISO 8601
  userId?: string      // só em order.updated: dono do pedido
  data: { ... }
}
```

## Eventos

| Evento | `data` | Efeito no cliente |
| --- | --- | --- |
| `nft.updated` | `{ priceEth, previousPriceEth, available, editions: [{ id, priceEth, available }] }` | atualiza o NFT nas listas, no detalhe e nos destaques; se o NFT está no carrinho, anuncia a mudança (`aria-live`) e busca o carrinho e a cotação de novo |
| `order.updated` | `{ status, failureReason, transaction }` | atualiza o pedido; em estado final (`confirmed` ou `declined`), busca o carrinho de novo e anuncia o resultado |

## Ordem, duplicatas e versões

`createEventGate()` (`src/shared/realtime/event-gate.ts`, com teste unitário) descarta:

1. evento com `id` já visto (duplicata);
2. evento com `version` menor ou igual à última aplicada para o mesmo recurso.

Além disso, o patch no cache só acontece se `event.version` for maior que a
versão do dado em cache. Assim, um evento antigo também não regride dado que
veio pelo REST.

## Reconexão e reconciliação

- Na queda, o cabeçalho mostra "Conexão em tempo real perdida. Reconectando…" (`role="status"`).
- Ao reconectar, o cliente invalida as queries **ativas** de `['nfts']`, `['user', …]` e `['guest', …]`, ou seja, busca de novo pelo REST tudo o que está na tela.
- O pedido pendente também faz polling a cada 3 s até um estado final. Um evento perdido nunca deixa a tela travada.

## Limitações do transporte simulado

O transporte é o WebSocket interceptado pelo MSW 2.15 com `@mswjs/socket.io-binding` 0.2.0.

- **Sem ping.** O binding responde ao handshake, mas não envia ping; sem ele o Engine.IO derruba o cliente em uns 30 s. O servidor simulado manda `"2"` a cada 20 s.
- **Sem broadcast nem salas.** O servidor simulado mantém o próprio registro de conexões e entrega `order.updated` só aos sockets do dono.
- **Auth do CONNECT ignorada.** O binding confirma a conexão antes de ler o pacote `40{…}`, por isso a identificação vai num evento (`session.subscribe`).
- **Um servidor por aba.** O "servidor" roda dentro da página; duas abas são dois servidores com o mesmo banco no `localStorage`, e eventos não cruzam abas.
- O MSW 3 já saiu, mas o binding exige `msw ^2.10.2`, então a versão fica travada em 2.15.0.
