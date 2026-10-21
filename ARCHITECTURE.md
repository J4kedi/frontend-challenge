# Arquitetura

Última revisão: 2026-10-20

Como a solução está montada, por quê, e onde ela para. Para rodar, veja o
[README](README.md). Para os contratos, [`docs/contracts/`](docs/contracts/);
para o design, [`docs/design/`](docs/design/).

## Visão geral

```
                ┌──────────────────────────── navegador ────────────────────────────┐
  Rotas (TanStack Router)  ── URL: busca, filtros, página, edição, redirect
        │
  Páginas e componentes (React 19, Tailwind 4, shadcn/ui)
        │                         ▲
  TanStack Query  ◄── applyEvent ─┘◄── socket.io-client ◄──┐
        │  (cache por dono: ['nfts'] · ['user', id] · ['guest', cartId])
  Axios (client.ts: token, X-Cart-Id, parse zod, ApiError)  │
        │                                                   │
  ───── rede ────────────────────────────────────────────────┼──────────────────
        ▼                                                   │
  MSW service worker → handlers REST ── banco simulado ── servidor Socket.IO
  (src/mocks)          (withNetwork: latência/falha)  (localStorage)  (ws.link + binding)
                └───────────────────────────────────────────────────────────────────┘
```

A camada de mocks é o "backend". O app não sabe que ela existe: fala REST
pelo Axios e Socket.IO pelo `socket.io-client`, como faria com um servidor
real. Trocar `VITE_ENABLE_MOCKS` para `false` e apontar `VITE_API_URL` e
`VITE_SOCKET_URL` para uma API de verdade não muda nenhum componente.

## Pastas e responsabilidades

| Pasta | Responsabilidade | Não faz |
| --- | --- | --- |
| `src/routes` | rotas finas: `validateSearch` (zod), `beforeLoad` (guarda), prefetch | regra de negócio, JSX de página |
| `src/features/<fatia>` | `api.ts` (chamadas Axios), `queries.ts` (keys, hooks, mutations), páginas e componentes da fatia | chamar `fetch` direto, ter dado fictício |
| `src/contracts` | schemas zod de REST e eventos, usados pelo cliente **e** pelos mocks | — |
| `src/shared` | cliente HTTP, erros, query keys, sessão, tempo real, `money.ts`, a11y | depender de uma fatia |
| `src/components` | layout, primitivos de UI e feedback | buscar dados |
| `src/mocks` | banco simulado, handlers REST, servidor Socket.IO, cenários e painel | ser importado por componentes (só pelo `main.tsx`, de forma dinâmica) |
| `src/styles` | tokens do Figma (`theme.css`) e o guard de tokens | — |

## Contratos tipados de ponta a ponta

1. O schema zod define o formato (`src/contracts/*.ts`), e o tipo vem do `z.infer`.
2. O handler MSW valida o corpo recebido com o mesmo schema (`readBody`) e devolve 422 com erro por campo.
3. O cliente valida a resposta (`request(schema, …)`). Resposta fora do contrato vira `ApiError('CONTRACT_MISMATCH')` em vez de dado errado na tela.
4. Os formulários usam os mesmos schemas no `zodResolver`, e as mensagens de validação são as mesmas do servidor.

Valores em ETH são strings decimais validadas por regex, e as contas são em
`BigInt` wei (`src/shared/lib/money.ts`, com teste unitário reproduzindo os
totais do Figma). Nada monetário passa por `Number`.

## Estado

| Tipo | Onde | Exemplos |
| --- | --- | --- |
| Estado do servidor | TanStack Query | catálogo, detalhe, carrinho, cotação, pedidos, perfil, carteiras, favoritos |
| Estado da URL | TanStack Router (`validateSearch` com zod e `.catch`) | busca, filtros, ordenação, aba, página, edição, `redirect` |
| Sessão | `sessionStore` (localStorage) + query `['session', token]` | token, dono |
| Rascunho | sessionStorage, por usuário | formulário de pagamento, tentativa de compra (chave de idempotência) |
| Local | `useState` / react-hook-form | campos, diálogos |

### Política de cache e sincronização

| Query | `staleTime` | Retry | Atualizada por |
| --- | --- | --- | --- |
| padrão | 30 s | 2×, só falha transitória (rede, timeout, 5xx), backoff de 1 → 2 → 4 s | foco na janela |
| `['nfts', 'list', query]` | 30 s, `keepPreviousData` | padrão | `nft.updated` (patch se a versão for maior) |
| `['nfts', 'detail', id]` | 30 s | padrão | `nft.updated` (patch de preço e edições) |
| `[owner, 'cart']` e cotação | 10 s / 0 s | padrão | mutations do carrinho (resposta substitui o cache e invalida a cotação), `nft.updated` de item no carrinho, `order.updated` final |
| `['user', id, 'orders', id]` | 30 s, **polling de 3 s enquanto pendente** | padrão | `order.updated`, polling |
| `['session', token]` | 5 min | não repete em 401 | login, logout, edição de perfil |

- **Mutations não repetem sozinhas.** A única exceção é o pedido, que repete com a mesma chave (ver "Pedido").
- **Respostas obsoletas são descartadas.** A chave é a query inteira, então uma resposta lenta de uma busca antiga cai na entrada dela, nunca na da tela atual. O `signal` do Query chega ao Axios, e o Query aborta o pedido de uma chave sem observadores.
- **Atualização otimista com rollback:** favoritos (`src/features/favorites/queries.ts`). O coração muda antes da resposta; se der erro, volta ao estado anterior, com toast e anúncio. As escritas saem em fila, na ordem dos cliques (`scope` do TanStack Query), e só a última grava a lista no cache. Assim, dois cliques rápidos com rede lenta não chegam invertidos à API.
- **Isolamento por usuário:** tudo que é privado fica sob `['user', id]`, e o carrinho do visitante sob `['guest', cartId]`. Logout e troca de usuário removem o prefixo inteiro.

## Sessão

- Login ou cadastro devolvem `{ token, expiresAt, user }`. O token, opaco e válido por 30 min, fica no `localStorage`; o usuário é estado de servidor (`GET /auth/session`). Um refresh restaura a sessão.
- **Por que não cookie HttpOnly:** o "servidor" roda na página (MSW), então um cookie seria escrito pelo próprio JavaScript e não teria proteção real. O token opaco é a opção honesta para a simulação. Com uma API real, o caminho é cookie HttpOnly + SameSite + CSRF; o interceptor do Axios é o único ponto a mudar.
- **Expiração:** o 401 `SESSION_EXPIRED` cai no interceptor, que só reage se o token da requisição é o token atual (resposta atrasada de outra sessão não derruba a nova). Ele limpa os dados privados e leva para `/login?redirect=<onde estava>&reason=expired`. No pagamento, o rascunho fica no sessionStorage do usuário, então quem entra de novo volta ao formulário preenchido.
- **Login sobre a página atual:** quando o visitante pede login a partir de uma página, o login abre sobre ela (`loginPrompt`, em `src/features/auth/login-prompt.ts`), sem navegar. Isso vale para favoritar, para "Conectar e finalizar" no carrinho e para o "Entrar" do header. Ao entrar, o diálogo fecha e a ação continua:
  - o favorito é **adicionado**, nunca alternado, porque a conta pode já tê-lo;
  - o carrinho passa para a conta e o app segue para o pagamento;
  - o "Entrar" do header mantém o visitante na mesma página.

  Os links continuam apontando para `/checkout` e `/login`, e só o clique simples do visitante é interceptado (`promptVisitor`). Abrir em nova aba ainda passa pela rota. As rotas `/login` e `/signup` seguem o Figma (modal sobre o marketplace) e atendem acesso direto, as rotas privadas e a sessão expirada.
- **Fechar o login volta para a página anterior** (`history.back`), não para o `redirect`: o redirect de uma rota privada (`/checkout`) mandaria de volta ao login. Pelo mesmo motivo, a expiração numa rota privada substitui a entrada do histórico em vez de empilhar.
- **Sessão sendo confirmada não é visitante:** logo depois de um reload, o token guardado ainda espera `GET /auth/session`. Nesse intervalo o header mostra um placeholder no lugar de "Entrar", e o favoritar espera a confirmação em vez de abrir o login.
- **Outra aba:** entrar, sair ou trocar de usuário numa aba recarrega as outras (evento `storage`), para nenhuma tela continuar com os dados do usuário anterior.
- **Logout e troca de usuário:** removem `['user', id]` e `['session']`, fecham o socket (o provider recria com o novo token) e iniciam um carrinho de visitante novo.
- Rotas privadas (`/_auth`): `beforeLoad` confirma a sessão pelo Query e redireciona com `redirect`. Só destinos internos são aceitos (`safeRedirect`), sem open redirect. Só um 401 manda para o login. Falha de rede ou 5xx mostra a página de erro com "Tentar novamente": com um token guardado, `/login` devolveria para a rota privada, num loop.

## Carrinho

- O carrinho vive **no servidor** para visitante e cliente. O visitante é identificado por `X-Cart-Id` (UUID no localStorage); com sessão, vale o carrinho da conta. O comportamento é igual nos dois casos e sobrevive a refresh.
- **Login preserva o carrinho:** `POST /cart/merge` soma as linhas do visitante às da conta, respeitando estoque e limite por pedido, e leva o cupom.
- **A cotação é a referência de valores.** A tela nunca soma preços: subtotal, desconto, taxa e total vêm de `GET /cart/quote`. Cada linha guarda o preço que o colecionador aceitou (`acknowledgedPriceEth`). Se o preço atual difere, a cotação marca `price-changed` e `purchasable: false` até ele aceitar.

## Pedido

1. A revisão busca a cotação de novo e só habilita "Confirmar e pagar" se ela está comprável.
2. `submitPurchase` (`src/features/checkout/purchase-attempt.ts`) grava `{ chave, corpo }` no sessionStorage **antes** do primeiro POST.
3. `POST /orders` com `Idempotency-Key`. Clique repetido é bloqueado pelo estado de envio e, mesmo assim, reusaria a chave.
4. Timeout, rede ou 5xx: até 2 novas tentativas **com a mesma chave**. O servidor devolve o mesmo pedido (200), sem criar outro.
5. `409 QUOTE_STALE`: o servidor recalculou e algo mudou. A tela mostra a cotação nova (`details.quote`) e pede confirmação de novo. A tentativa antiga é descartada (a chave muda com o conteúdo).
6. Pagamento **recusado** encerra a tentativa. Se o colecionador tentar de novo com o mesmo carrinho e a mesma cotação, o reenvio da chave antiga devolveria o mesmo pedido recusado; por isso `submitPurchase` descarta essa tentativa e cria outra, com chave nova.
7. Pedido criado e **pendente**: a rota `/orders/$id` mostra o status. `order.updated` ou o polling levam a `confirmed` ou `declined`, que são terminais. Reload, queda de conexão ou nova aba: `GET /orders/:id` liquida o que venceu, e a página de pagamento bloqueia uma segunda compra enquanto houver pedido pendente.
8. **Uma compra por vez.** Enquanto há pedido pendente, os itens ainda estão no carrinho; um segundo pedido (voltar ao pagamento logo depois de confirmar) cobraria duas vezes. O servidor responde `409 ORDER_IN_PROGRESS`, e o pagamento atualiza a lista de pendentes logo após criar o pedido, mostrando "compra em processamento".
9. O recibo só aparece para `confirmed` e reproduz o snapshot gravado no pedido.

## Tempo real

Detalhes em [`docs/contracts/realtime.md`](docs/contracts/realtime.md). Em resumo:

- Os eventos chegam pelo `socket.io-client`, sem atalho para setters ou cache.
- `createEventGate` descarta duplicatas (mesmo `id`) e versões antigas; o patch só aplica versão maior que a do cache.
- `nft.updated` corrige preço e estoque em lista, detalhe e destaques. Se o NFT está no carrinho, anuncia a mudança e busca de novo carrinho e cotação, o que bloqueia o pagamento até o colecionador aceitar.
- `order.updated` só é aceito para o usuário atual. O servidor também só entrega ao dono.
- Na reconexão, as queries ativas são invalidadas (reconciliação com o REST). Listeners e sockets são liberados no cleanup do efeito.
- **Queda com duração** (`POST /__mock/socket/drop { seconds }`): o servidor simulado fica fora do ar e conexões novas não recebem handshake até o prazo, como um host inalcançável. O cliente segue "reconectando", com o aviso fixo sob o header. Eventos publicados nesse intervalo não chegam a ninguém; a invalidação na volta recupera o estado pelo REST, e um toast confirma a reconexão (`10-realtime-resilience.spec.ts` prova o evento perdido e a recuperação).

### Prontidão do mock e ordem de carga

O app renderiza de imediato, e o hero (LCP) não espera o MSW. Um interceptor,
registrado no `main.tsx` só com mocks ligados, segura as requisições até
`worker.start()` terminar. O `socket.io-client` é importado dinamicamente
**depois** disso, porque ele captura o construtor `WebSocket` no import, e o
MSW precisa ter feito o patch antes. Nada disso é caminho de negócio: é a
ordem de inicialização do transporte.

**Aba parada.** O navegador desliga um service worker sem eventos por ~30 s,
e o worker do MSW guarda as abas atendidas só em memória: reiniciado, ele
deixaria tudo passar para o host (404 na Vercel). Depois de 20 s sem
requisições, a próxima espera a aba se registrar de novo com `MOCK_ACTIVATE`,
a mesma mensagem que o MSW envia no início (`mocksReady`, em
`src/app/transport.ts`).

## Mocks

- **Transporte:** service worker do MSW 2.15 para REST, e interceptação de WebSocket do MSW com `@mswjs/socket.io-binding` 0.2.0 para o Socket.IO.
- **Banco simulado:**
  - seed determinístico (`src/mocks/db/seed.ts`, PRNG mulberry32): 239 NFTs com as contagens de coleção do Figma; os 9 mais recentes são exatamente o grid do Figma;
  - 2 usuários, carteiras e cupons;
  - fica em memória e é espelhado no `localStorage` (`kurio:mockdb:v1`) a cada mudança, sobrevivendo a refresh.
- **Reset:** `?mock-reset`, `POST /api/__mock/reset` ou o painel restauram o seed inteiro.
- **Cenários:** `?scenario=<nome>` (persistente) ou o painel. Os nomes estão no [README](README.md#cenários-de-mock).
  - A latência é derivada de um hash da requisição, sem `Math.random`, então a mesma execução tem os mesmos tempos.
  - As falhas são determinísticas: por exemplo, as 3 primeiras tentativas de cada GET no `http-5xx`.
- **API de controle** (`/api/__mock/*`): muda o banco **e** publica o evento, do mesmo jeito que um servidor real faria. Os testes e o painel usam só ela.
- **Limitações:**
  - cada aba roda a própria cópia do servidor simulado sobre o mesmo `localStorage`; elas se mantêm iguais porque cada uma adota o que as outras gravam (evento `storage`) e os eventos publicados são repassados às outras abas por `BroadcastChannel`. Duas escritas simultâneas em abas diferentes ainda seguem "a última vence";
  - o banco simulado vive no `localStorage` (cerca de 5 MB): avatares grandes em várias contas podem enchê-lo, e a partir daí as mudanças valem só até o reload. "Restaurar os dados iniciais" (painel) libera o espaço;
  - o binding 0.2.0 não pinga, não faz broadcast e ignora a auth do CONNECT (contornados no servidor simulado);
  - o `request` fixture do Playwright não passa pelo MSW, por isso os testes chamam a API de controle de dentro da página.

## Acessibilidade

- Link "Pular para o conteúdo"; foco visível em `accent` em todo elemento focável; `scroll-padding` para o foco nunca ficar sob a tab bar.
- Diálogos e drawers da Radix: foco preso, Esc fecha e o foco volta ao gatilho.
- Formulários: label em todo campo (oculto só visualmente onde o Figma usa placeholder), `aria-invalid` + `aria-describedby`, foco no primeiro erro do servidor.
- Status nunca só por cor: preço anterior riscado, edição esgotada riscada e nomeada, filtro ativo com barra lateral, carteira conectada com texto.
- Uma região `aria-live` anuncia mutations e mudanças de tempo real.
- `prefers-reduced-motion` desliga shimmer, spinner e transições.
- O teste `11-accessibility` roda o axe (WCAG 2.1 AA) em início, detalhe, login e carrinho, e também cobre teclado e foco.

## Performance

- Rotas com `autoCodeSplitting`; a camada de mocks em chunk próprio, carregado em paralelo à renderização.
- Imagens: AVIF e WebP em 3 larguras com `srcset`/`sizes`, `width`/`height` fixos e `preload` + `fetchpriority="high"` do hero.
- Fonte local (sem ida ao Google Fonts) com `font-display: swap`.
- Skeletons do tamanho final (CLS 0).
- Medidas e análise em [`docs/quality/lighthouse.md`](docs/quality/lighthouse.md).

## Decisões de UX

- Login e cadastro são **rotas** (`/login`, `/signup`) que viram modal no desktop, como no Figma. Assim têm URL, `redirect` e funcionam com refresh. Quando o pedido de login parte de uma página (Entrar, favoritar, finalizar a compra), o mesmo modal abre sobre essa página, não sobre a home.
- A edição escolhida fica na URL (`?edition=1-10`): o link compartilhado abre na mesma edição.
- "Comprar" no detalhe adiciona e leva ao carrinho; no mobile, o botão do carrinho adiciona sem sair da página.
- A cotação é refeita na revisão, e o botão final fica desabilitado enquanto ela atualiza ("Atualizando valores…").
- Links de páginas fora do escopo aparecem, mas marcados como indisponíveis. Ações fora do escopo dizem isso em vez de simular sucesso.

Os desvios do Figma estão listados, um a um, em [`docs/design/screens.md`](docs/design/screens.md#desvios-do-figma).

## Limitações conhecidas

- Um pedido pode misturar NFTs de redes diferentes com uma única taxa da rede escolhida (simplificação da simulação).
- As baselines visuais são Linux-only, porque a renderização de fontes varia por SO. Em Windows e macOS os asserts de pixel são ignorados, e as baselines são geradas no container oficial do Playwright (`pnpm test:visual:update`).
- O teste de timeout do pedido usa tempo real (~12 s): o timeout do Axios no XHR é nativo do navegador e não obedece ao `page.clock`.
