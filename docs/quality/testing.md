# Testes

Última revisão: 2026-10-20

## Como rodar

```bash
pnpm test:unit            # Vitest (Node): dinheiro, gate de eventos, cn, guard de tokens
pnpm test:e2e             # Playwright: build de demonstração + preview, desktop 1440 e mobile 390
pnpm test:e2e:report      # relatório HTML; falhas trazem trace, screenshot e contexto
pnpm test:visual          # regressão visual no container Linux oficial do Playwright (Docker)
pnpm test:visual:update   # regera as baselines visuais
```

- **Isolamento:** cada teste abre um contexto novo do Chromium (storage vazio) e entra com `?mock-reset`, ou seja, parte do seed conhecido. Nenhum teste depende de outro.
- **Determinismo:**
  - dados vêm do seed com PRNG fixo;
  - latências dos cenários vêm do hash da requisição;
  - eventos são disparados pela API de controle (`/api/__mock/*`) no momento exato do teste.
- **Sem atalhos:** o REST passa pelos handlers MSW, e os eventos passam pelo `socket.io-client` (a API de controle publica pelo servidor Socket.IO simulado). Os asserts observam a interface: texto, `aria-*`, URL, região `aria-live`. Quando o resultado de uma operação precisa ser conferido, os testes perguntam à própria API simulada (ex.: quantos pedidos existem).
- **Tempo:** cenários de tempo usam latência controlada por cenário (`slow`, `jitter`, `order-timeout`). O timeout do pedido roda em tempo real (~12 s), porque o timeout de XHR do Axios é nativo do navegador e não obedece ao `page.clock`.
- **Regressão visual:**
  - baselines só para Linux (a renderização de fonte muda por SO), versionadas em `tests/e2e/__screenshots__`;
  - geradas e conferidas no container `mcr.microsoft.com/playwright:v1.64.1-noble`;
  - fora do Linux os asserts de pixel são ignorados (`ignoreSnapshots`), e o restante de cada teste roda normalmente.

## Matriz: requisito → spec

| # | Requisito do enunciado (§9) | Spec | Desktop | Mobile |
| --- | --- | --- | :---: | :---: |
| 1 | Busca, filtros combinados, ordenação, paginação e restauração pelo histórico (+ respostas fora de ordem, vazio) | `01-catalog.spec.ts` | ✅ | ✅ |
| 2 | Acesso direto ao detalhe, edição indisponível, limite de quantidade, recurso inexistente, rota inexistente | `02-detail.spec.ts` | ✅ | ✅ |
| 3 | Cadastro (conflito e sucesso), validação e erro de login, expiração de sessão, logout e troca de usuário sem vazamento; fechar o login aberto pelo carrinho volta ao carrinho | `03-auth.spec.ts` | ✅ | ✅³ |
| 4 | Favoritos persistidos, falha de mutation com rollback; visitante entra sem sair do detalhe e o favorito é salvo | `04-favorites.spec.ts` | ✅ | ✅ |
| 5 | Carrinho: quantidades, remoção, cupom expirado, inválido e válido, persistência após refresh e login (merge) | `05-cart.spec.ts` | ✅ | ✅ |
| 6 | Compra completa, do catálogo ao recibo confirmado | `06-purchase.spec.ts` | ✅ | ✅ |
| 7 | Pagamento recusado, clique repetido, timeout com recuperação do mesmo pedido, mesma chave com corpo diferente → 409 | `07-payment-failures.spec.ts` | ✅ | ✅ |
| 8 | Perfil (dados, validação, avatar, senha errada e certa) e carteiras (endereço inválido, principal, secundária) | `08-profile-wallets.spec.ts` | ✅ | ✅ |
| 9 | Preço muda via Socket.IO durante o checkout (aviso, total, bloqueio, aceitar, comprar); edição esgota durante o checkout | `09-realtime-checkout.spec.ts` | ✅ | ✅ |
| 10 | Eventos duplicados e antigos; queda de 3 s com evento perdido e reconciliação REST na volta; pedido pendente + queda do socket + reload sem nova compra | `10-realtime-resilience.spec.ts` | ✅ | ✅ |
| 11 | Pular para o conteúdo, foco preso no diálogo e Esc, erros ligados aos campos, axe WCAG 2.1 AA em 4 telas | `11-accessibility.spec.ts` | ✅ | ✅¹ |
| 12 | Skeletons em rede lenta, falha 503 com "Tentar novamente", sem conexão | `12-loading-and-failures.spec.ts` | ✅ | ✅ |
| — | Regressão visual: início, detalhe, carrinho e pagamento | `13-visual.spec.ts` | ✅ | ✅ |
| — | Header fixo, item ativo por seção (scroll-spy), itens fora do escopo avisam, Mercado a partir de outra página | `14-navigation.spec.ts` | ✅ | —² |
| — | Painel de mocks: rótulos com os dados atuais, ação desabilitada com motivo, axe no painel aberto, Esc, queda com duração escolhida, login rápido | `15-mock-panel.spec.ts` | ✅ | ✅ |

¹ O teste de foco preso no diálogo de login roda só no desktop: no mobile o
login é tela cheia (Figma), sem diálogo.

² O header de navegação é desktop; no mobile a navegação é a tab bar.

³ Fechar o login pelo X é desktop: no mobile o login é tela cheia, sem X, e
o voltar do navegador faz o mesmo caminho.

## Testes unitários

| Arquivo | Protege |
| --- | --- |
| `src/shared/lib/money.test.ts` | aritmética em wei sem erro de float; reproduz os totais do Figma (26,83 + 0,016 = 26,846 ETH); formatação |
| `src/shared/realtime/event-gate.test.ts` | descarte de duplicatas e de versões antigas, por recurso |
| `src/shared/lib/cn.test.ts` | o merge de classes mantém a cor ao lado de um tamanho de fonte do Figma (bug achado pelo axe) |
| `src/styles/design-tokens.test.ts` | nenhum `.tsx` usa cor, fonte ou sombra fora dos tokens |

## Bugs que a suíte encontrou

A primeira execução completa (27/35 no desktop) expôs defeitos reais, todos
corrigidos antes da entrega:

- o `tailwind-merge` removia a cor do texto dos botões (contraste, achado pelo axe);
- o layout da conta estourava a largura no mobile e escondia o botão "Salvar";
- `<dl>` com estrutura inválida no resumo;
- `form` aninhado (cupom dentro do pagamento);
- ids duplicados (busca e cupom);
- botão de fechar dos diálogos em inglês;
- elemento focado podendo ficar sob a tab bar mobile.

## Última execução

| Suíte | Resultado |
| --- | --- |
| Vitest | 17/17 |
| Playwright, desktop + mobile (Windows, asserts de pixel ignorados) | 83 passaram + 3 pulados (diálogo, header e X do login só no desktop), 43 testes por projeto, 3,4 min com 2 workers |
| Regressão visual (Docker Linux) | 8/8, conferida numa segunda execução sem atualizar |
| **CI (GitHub Actions)** — E2E + visual dentro de `mcr.microsoft.com/playwright:v1.64.1-noble` | 77 passaram em 2,5 min; `verify` (typecheck, lint, unit, build) verde. Na primeira execução o CI pegou uma baseline visual desatualizada (pontos do carrossel), regerada no mesmo commit do CI |
| Playwright contra a **URL publicada** (`E2E_BASE_URL`, sem visual) | 69 passaram + 1 pulado, 2,7 min |
| Checkout limpo (`git clone` + `pnpm install --frozen-lockfile`) | typecheck, lint, unit (17/17), build e E2E 06 + 09 (6/6) |
