# Contratos REST

Última revisão: 2026-10-20

A fonte de verdade são os schemas zod em [`src/contracts/`](../../src/contracts/).
O cliente (`src/shared/api/client.ts`) valida **toda** resposta com eles; os
handlers MSW (`src/mocks/handlers/`) validam **todo** corpo recebido com os
mesmos schemas. Mudar um contrato muda os dois lados no mesmo commit.

## Regras gerais

- Base: `VITE_API_URL` (padrão `/api`). JSON em UTF-8.
- **ETH é string decimal** (`"1.19"`, até 18 casas): nenhum valor monetário trafega como número.
- **Autenticação:** `Authorization: Bearer <token>`. O token é opaco e expira em 30 min.
- **Carrinho do visitante:** `X-Cart-Id: <uuid>` em toda requisição. Com `Authorization`, vale o carrinho da conta.
- **Idempotência:** `POST /orders` exige `Idempotency-Key`.

### Erros

Todo status não-2xx tem o mesmo corpo (`apiErrorBody`):

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Revise os campos destacados", "fields": { "email": "E-mail inválido" }, "retryable": false } }
```

| Status | `code` | Quando |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | corpo ilegível, cabeçalho obrigatório ausente |
| 401 | `UNAUTHENTICATED` / `SESSION_EXPIRED` / `INVALID_CREDENTIALS` | sem token, token expirado, login errado |
| 403 | `FORBIDDEN` / `WALLET_REJECTED` | recurso de outro usuário; carteira recusou a conexão |
| 404 | `NOT_FOUND` | NFT, pedido, item ou carteira inexistente |
| 409 | `EMAIL_TAKEN` / `USERNAME_TAKEN` / `OUT_OF_STOCK` / `QUOTE_STALE` / `IDEMPOTENCY_CONFLICT` / `WALLET_DISCONNECTED` / `WALLET_SLOT_TAKEN` | conflitos |
| 422 | `VALIDATION_ERROR` / `QUANTITY_LIMIT` / `COUPON_INVALID` / `COUPON_EXPIRED` | regra de campo, com `fields` |
| 500/503 | `INTERNAL` / `UNAVAILABLE` | falha transitória (`retryable: true`) |

No cliente, toda falha vira `ApiError` (`src/shared/api/errors.ts`), inclusive
`NETWORK_ERROR`, `TIMEOUT` e `CONTRACT_MISMATCH` (resposta fora do schema).

## Sessão e conta

| Método e rota | Corpo | Resposta |
| --- | --- | --- |
| `POST /auth/signup` | `signupBody` (usuário, e-mail, senha, confirmação) | `201 session` · `409 EMAIL_TAKEN/USERNAME_TAKEN` |
| `POST /auth/login` | `loginBody` | `200 session` · `401 INVALID_CREDENTIALS` |
| `GET /auth/session` | — | `200 session` · `401 SESSION_EXPIRED` |
| `POST /auth/logout` | — | `204` |
| `GET /me/profile` | — | `200 user` |
| `PATCH /me/profile` | `profileBody` | `200 user` · `409 EMAIL_TAKEN/USERNAME_TAKEN` |
| `PUT /me/avatar` / `DELETE /me/avatar` | `{ dataUrl }` (PNG/JPG/WebP ≤ 1 MB) | `200 user` · `422` |
| `PUT /me/password` | `passwordBody` | `204` · `422 fields.currentPassword` |

`session = { token, expiresAt, user }`. Senhas ficam só como hash PBKDF2-SHA256
com sal por usuário no banco simulado.

## Catálogo

| Método e rota | Parâmetros | Resposta |
| --- | --- | --- |
| `GET /nfts` | `q`, `collection` (repetível), `network` (repetível), `priceMin`, `priceMax`, `sort` (`recent`·`price-asc`·`price-desc`·`name`), `tab` (`all`·`new`·`trending`), `page`, `pageSize` (≤ 48) | `nftListResponse` = página + `facets` |
| `GET /nfts/:id` | — | `nftDetail` · `404` |
| `GET /nfts/:id/related` | — | `{ items: nftSummary[] }` (mesma coleção) |
| `GET /nfts/highlights` | — | `{ featured, related }` |

As `facets` contam, para cada coleção ou rede, os resultados dos **outros**
filtros ativos. Por isso marcar "Música" não zera a contagem de "Jogos".
`nftSummary.version` sobe a cada mudança de preço ou estoque. É ela que ordena
os eventos `nft.updated`.

## Favoritos

| Método e rota | Resposta |
| --- | --- |
| `GET /me/favorites` | `{ nftIds }` |
| `PUT /me/favorites/:nftId` | `{ nftIds }` · `404` · `500` no cenário `mutation-error` |
| `DELETE /me/favorites/:nftId` | `{ nftIds }` |

## Carrinho e cotação

| Método e rota | Corpo | Resposta |
| --- | --- | --- |
| `GET /cart` | — | `cart` |
| `POST /cart/items` | `{ nftId, editionId, quantity }` | `cart` · `409 OUT_OF_STOCK` · `422 QUANTITY_LIMIT` |
| `PATCH /cart/items/:lineId` | `{ quantity }` | `cart` |
| `DELETE /cart/items/:lineId` | — | `cart` |
| `POST /cart/acknowledge` | — | `cart` (aceita os preços atuais) |
| `PUT /cart/coupon` / `DELETE /cart/coupon` | `{ code }` | `cart` · `422 COUPON_INVALID/COUPON_EXPIRED` |
| `POST /cart/merge` | `{ guestCartId }` | `cart` da conta, com o carrinho do visitante somado (respeita estoque e limite) |
| `GET /cart/quote?network=` | — | `quote` |

A **cotação** é a referência de valores. Ela traz, por linha, `unitPriceEth`,
`lineTotalEth` e `status` (`ok`, `price-changed`, `insufficient` ou
`unavailable`), mais `subtotalEth`, `discountEth`, `networkFeeEth`, `totalEth`,
o estado do cupom e `purchasable`. O `id` é um hash do conteúdo: se qualquer
valor muda, o `id` muda.

Taxa de rede simulada: base + valor por linha (Ethereum 0,004 + 0,004/linha,
o que dá 0,016 ETH para 3 linhas, como no Figma). Cupons de demonstração:
`KURIO10` (10%), `LANCAMENTO15` (15%) e `EXPIRADO5` (expirado).

## Pedidos

| Método e rota | Corpo | Resposta |
| --- | --- | --- |
| `POST /orders` + `Idempotency-Key` | `createOrderBody` = `{ quoteId, network, walletId, provider, buyer }` | `201 order` (pendente) · `200 order` (mesma chave e mesmo corpo) · `409 IDEMPOTENCY_CONFLICT` (mesma chave, corpo diferente) · `409 QUOTE_STALE` (com `details.quote`) · `409 WALLET_DISCONNECTED` |
| `GET /orders/:id` | — | `order` · `403` (outro usuário) · `404` |
| `GET /orders?status=pending` | — | `{ items: order[] }` |

O pedido é um **snapshot**: linhas, preços, desconto, taxa e total ficam
gravados na criação, e mudanças posteriores no catálogo não alteram o recibo.
Na criação, o estoque é reservado. O pagamento simulado liquida 1,5 s depois:
confirmado remove do carrinho **só** as quantidades compradas; recusado
devolve o estoque e deixa o carrinho intacto. Leituras de um pedido vencido
liquidam na hora, então um reload nunca fica preso em pendente.

## Carteiras

| Método e rota | Corpo | Resposta |
| --- | --- | --- |
| `GET /me/wallets` | — | `{ items: wallet[] }` |
| `POST /me/wallets` | `{ slot, ...walletFields }` | `201 wallet` · `409 WALLET_SLOT_TAKEN` |
| `PATCH /me/wallets/:id` | `walletFields` | `200 wallet` · `403` |
| `POST /me/wallets/:id/connect` | `{ provider, network }` | `200 wallet` com `connection` · `403 WALLET_REJECTED` |
| `POST /me/wallets/:id/disconnect` | — | `200 wallet` |

O endereço é validado por rede: EVM `0x` + 40 hexadecimais; Solana em base58
com 32 a 44 caracteres.

## API de controle da simulação (`/api/__mock/*`)

Usada pelo painel de mocks e pelos testes. Ela muda o banco simulado **e**
publica o evento Socket.IO correspondente, como um servidor real faria.

| Método e rota | Efeito |
| --- | --- |
| `GET /__mock/state` | cenário ativo e lista de cenários |
| `PUT /__mock/scenario` `{ name }` | troca o cenário |
| `POST /__mock/reset` | restaura o seed inteiro e derruba os sockets |
| `POST /__mock/nfts/:id` `{ editionId?, priceEth?, available? }` | muda preço ou estoque e publica `nft.updated` |
| `POST /__mock/session/expire` | expira todas as sessões |
| `POST /__mock/socket/drop` | derruba as conexões Socket.IO (o cliente reconecta) |
| `POST /__mock/events/replay` `{ mode: 'duplicate' \| 'stale' }` | reenvia o último evento, igual ou uma versão mais antiga |
