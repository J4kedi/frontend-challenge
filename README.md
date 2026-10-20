# Kurio — Marketplace de NFTs

Solução do [desafio frontend da Jungle Gaming](docs/challenge.md). É um
marketplace de NFTs com descoberta, compra e conta do colecionador, em
desktop e mobile, fiel ao [Figma](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge).
Toda a API, a autenticação, as carteiras e o pagamento são simulados na camada
de rede, com MSW e Socket.IO.

- **Demo publicada:** https://kurio-nft-marketplace-vert.vercel.app
- **Repositório:** https://github.com/kauan-pardini/frontend-challenge
- **Arquitetura:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Design system:** [docs/design](docs/design/README.md) · página viva em `/design-system`
- **Contratos:** [REST](docs/contracts/rest.md) · [Socket.IO](docs/contracts/realtime.md)
- **Qualidade:** [testes](docs/quality/testing.md) · [Lighthouse](docs/quality/lighthouse.md) · [critérios eliminatórios](docs/quality/eliminatorios.md)
- **Como foi construído:** [desenvolvimento agêntico](docs/agentic-development.md)

## Stack

| Responsabilidade | Tecnologia | Onde participa |
| --- | --- | --- |
| Interface | React 19 + TypeScript 6 | `src/` |
| Roteamento | TanStack Router (rotas por arquivo, `validateSearch` com zod) | `src/routes` |
| Estado remoto | TanStack Query 5 | `src/features/*/queries.ts` |
| Cliente HTTP | Axios (único cliente; valida as respostas com zod) | `src/shared/api/client.ts` |
| Tempo real | socket.io-client 4.8 | `src/shared/realtime` |
| Estilo | Tailwind CSS 4 com os tokens do Figma | `src/styles/theme.css` |
| Componentes | shadcn/ui (Radix), restilizados | `src/components/ui` |
| Mocking | MSW 2.15 + @mswjs/socket.io-binding | `src/mocks` |
| E2E e regressão visual | Playwright 1.64 + axe | `tests/e2e` |
| Auditoria | Lighthouse 13 | `scripts/lighthouse.mjs` |
| Build | Vite 8 | `vite.config.ts` |

## Rodar localmente

Requisitos: Node 22+ e pnpm 12. Com o Corepack, `corepack enable` já basta,
porque a versão está em `packageManager`.

```bash
pnpm install
pnpm dev            # http://localhost:5173, mocks ligados
```

Nenhum serviço externo é necessário: o checkout limpo roda sozinho.

### Comandos

| Comando | O que faz |
| --- | --- |
| `pnpm dev` | desenvolvimento com mocks e HMR |
| `pnpm build` | build de produção, que é o mesmo build de demonstração publicado (mocks ligados) |
| `pnpm preview` | serve o build em http://localhost:4173 |
| `pnpm typecheck` | TypeScript em modo projeto (app, testes e configs) |
| `pnpm lint` | ESLint (TypeScript + regras de hooks do React) |
| `pnpm test:unit` | Vitest: dinheiro em wei, gate de eventos, `cn`, guard de tokens |
| `pnpm test:e2e` | Playwright: build + preview, projetos `desktop` (1440) e `mobile` (390) |
| `pnpm test:e2e:report` | abre o relatório HTML (traces das falhas incluídos) |
| `E2E_BASE_URL=<url> pnpm test:e2e` | roda a mesma suíte contra uma URL publicada (sem build local) |
| `pnpm test:visual` | compara a regressão visual no container Linux oficial do Playwright (Docker) |
| `pnpm test:visual:update` | regera as baselines visuais Linux no container oficial do Playwright (Docker) |
| `pnpm lighthouse` | auditoria Lighthouse: início e detalhe, mobile e desktop, 3 execuções, mediana |
| `pnpm figma:extract` | exporta frames, artes e ícones do Figma (exige `FIGMA_TOKEN`) |
| `pnpm images` | gera as imagens AVIF/WebP servidas a partir das artes do Figma |

## Variáveis de ambiente

Os valores padrão estão em `.env.development` e `.env.production` (versionados,
sem segredo). Sobrescreva no `.env.local`. Modelo em [`.env.example`](.env.example).

| Variável | Padrão | Para quê |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `true` | liga a camada de mocks (MSW + Socket.IO simulado) |
| `VITE_API_URL` | `/api` | base da API REST |
| `VITE_SOCKET_URL` | `wss://realtime.kurio.mock` | endereço do Socket.IO (interceptado pelos mocks) |
| `VITE_MOCK_PANEL` | `true` | mostra o painel de cenários (canto inferior esquerdo) |
| `FIGMA_TOKEN` | — | só para `pnpm figma:extract` |

## Credenciais e dados fictícios

| Usuário | E-mail | Senha | Particularidade |
| --- | --- | --- | --- |
| Ana Colecionadora | `ana@kurio.test` | `kurio2026` | carteira MetaMask na Ethereum; 1 favorito |
| Bruno Arte | `bruno@kurio.test` | `kurio2026` | carteira Coinbase na Polygon; 1 item no carrinho |

Cupons: `KURIO10` (10%), `LANCAMENTO15` (15%), `EXPIRADO5` (expirado).
Qualquer outro código é inválido.

As senhas ficam no banco simulado só como hash PBKDF2-SHA256 com sal; nenhuma
senha é armazenada em claro.

## Cenários de mock

Escolha um cenário pela URL, com `?scenario=<nome>` (ele fica salvo), ou pelo
**painel "Mocks"**. Para voltar ao estado inicial: `?mock-reset`, o botão
"Resetar todos os dados do mock" no painel, ou `POST /api/__mock/reset`.

| Cenário | Efeito |
| --- | --- |
| `default` | latência de 60–180 ms, tudo funciona |
| `slow` | toda resposta leva 1,8–2,6 s (skeletons e carregamentos) |
| `jitter` | 30 ms a 1,5 s por requisição: respostas fora de ordem |
| `offline` | toda chamada falha como erro de rede |
| `http-5xx` | cada GET falha com 503 nas 3 primeiras tentativas |
| `mutation-error` | favoritar responde 500 (rollback da atualização otimista) |
| `empty` | o catálogo não retorna nada |
| `order-timeout` | o primeiro POST do pedido responde depois do timeout do cliente |
| `payment-declined` | a rede simulada recusa o pagamento |
| `wallet-rejected` | a extensão de carteira recusa a conexão |
| `events-chaos` | todo evento chega duplicado e seguido de uma versão antiga |

O painel também dispara eventos pelo servidor simulado: altera o preço ou
esgota o 1º item do carrinho, derruba o Socket.IO, reenvia o último evento e
expira a sessão. Tudo passa pela API de controle
([`docs/contracts/rest.md`](docs/contracts/rest.md#api-de-controle-da-simulação-api__mock)),
que atualiza o REST **e** publica o evento.

## Reproduzir os fluxos de falha

| Fluxo | Passos |
| --- | --- |
| Busca com respostas fora de ordem | `/?scenario=jitter`: marque e desmarque filtros depressa. O resultado final corresponde sempre ao último filtro. |
| Falha e nova tentativa | `/?scenario=http-5xx`: depois de 3 falhas aparece "Não foi possível carregar o catálogo"; "Tentar novamente" carrega. |
| Sem conexão | `/?scenario=offline`: mensagem de rede em cada bloco. |
| Favorito com rollback | entre como Ana; no painel, escolha "Falha em mutation" e favorite um NFT. O coração volta e um toast explica. |
| Cupom inválido ou expirado | no carrinho, use `EXPIRADO5` ou `ABC123`. |
| Preço muda durante o pagamento | com um item no carrinho, abra o pagamento e use "Alterar preço do 1º item" no painel. O aviso aparece, o total muda, e a revisão exige "Aceitar novos preços". |
| Edição esgota durante a compra | painel → "Esgotar a edição do 1º item": a compra fica bloqueada até ajustar o carrinho. |
| Pagamento recusado | `?scenario=payment-declined` e conclua a compra: o pedido aparece recusado e o carrinho continua igual. |
| Timeout com recuperação | `?scenario=order-timeout` e confirme: depois de ~8 s o cliente reenvia com a mesma chave e recebe o **mesmo** pedido. |
| Carteira recusa | `?scenario=wallet-rejected` e clique em "Conectar carteira". |
| Eventos duplicados ou antigos | `/nft/emerald-ape-042?scenario=events-chaos` e mude o preço pelo painel. O preço novo nunca regride. |
| Desconexão com pedido pendente | `?scenario=slow`, confirme uma compra, derrube o Socket.IO pelo painel e recarregue: o mesmo pedido termina confirmado. |
| Sessão expirada no meio do pagamento | painel → "Expirar a sessão agora" e continue. O login volta para onde você estava, com o formulário preenchido. |

## Testes

```bash
pnpm test:unit
pnpm test:e2e                 # build + preview + Chromium desktop e mobile
pnpm test:e2e:report          # relatório HTML com traces das falhas
```

Os 12 cenários do enunciado são os arquivos `tests/e2e/01…12-*.spec.ts`
(matriz em [`docs/quality/testing.md`](docs/quality/testing.md)). A regressão
visual (`13-visual.spec.ts`) compara início, detalhe, carrinho e pagamento. As
baselines são Linux-only e versionadas: fora do Linux esses asserts são
ignorados. Regere com `pnpm test:visual:update`, que usa Docker.

## Deploy

Publicado na Vercel: **https://kurio-nft-marketplace-vert.vercel.app**. O deploy sai do commit da `main` marcado com a tag `v1.0.0`, e a suíte E2E roda também contra a URL publicada:

```bash
E2E_BASE_URL=https://kurio-nft-marketplace-vert.vercel.app pnpm exec playwright test --grep-invert @visual
```

A demo é o próprio build de produção (`.env.production` liga os mocks).
`vercel.json` configura instalação com pnpm, fallback de SPA (refresh e acesso
direto a qualquer rota, sem engolir `/api/*`) e cache dos assets. O service
worker `mockServiceWorker.js` é servido sem cache.

## Estrutura

```
src/
  app/          QueryClient e router
  routes/       rotas (finas) — TanStack Router por arquivo
  features/     catalog · nft · favorites · cart · checkout · orders · auth · account
  contracts/    schemas zod de REST e eventos (cliente + mocks)
  shared/       cliente HTTP, erros, query keys, sessão, tempo real, dinheiro, a11y
  components/   layout, primitivos de UI (shadcn), formulários, feedback, ícones
  mocks/        banco simulado, handlers, servidor Socket.IO, cenários, painel
  styles/       tokens do Figma + guard de tokens
tests/e2e/      Playwright (12 cenários + visual) · support/ com helpers
scripts/        Figma, imagens, baselines visuais, Lighthouse
docs/           design, contratos, qualidade, processo
```
