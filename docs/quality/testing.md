# Testes

Última revisão: 2026-10-21

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
- **Tempo:** a latência de cada cenário é controlada (`slow`, `jitter`, `order-timeout`). Quando o teste depende de quanto tempo passou, o relógio é do Playwright (`page.clock`) e avança sem espera real. Testes com relógio controlado:
  - o timeout de 8 s do pedido: o Axios usa o adapter `fetch`, cujo timeout é um `setTimeout`;
  - a sessão que expira sozinha depois de 30 min;
  - a aba parada, com o service worker desligado depois de 25 s.
- **Regressão visual:**
  - baselines só para Linux (a renderização de fonte muda por SO), versionadas em `tests/e2e/__screenshots__`;
  - geradas e conferidas no container `mcr.microsoft.com/playwright:v1.64.1-noble`;
  - fora do Linux os asserts de pixel são ignorados (`ignoreSnapshots`), e o restante de cada teste roda normalmente.

## Matriz: requisito → spec

| # | Requisito do enunciado (§9) | Spec | Desktop | Mobile |
| --- | --- | --- | :---: | :---: |
| 1 | Busca, filtros combinados, ordenação, paginação e restauração pelo histórico (+ respostas fora de ordem, vazio, página além da última; filtros digitados à mão na URL, como `?priceMin=1&networks=solana`) | `01-catalog.spec.ts` | ✅ | ✅ |
| 2 | Acesso direto ao detalhe, edição indisponível, limite de quantidade, recurso inexistente, rota inexistente | `02-detail.spec.ts` | ✅ | ✅ |
| 3 | Cadastro (conflito e sucesso), validação e erro de login, expiração de sessão, logout e troca de usuário sem vazamento; o login pedido pelo carrinho e pelo "Entrar" do header abre sobre a página atual; sair apaga o rascunho do pagamento; a sessão expira sozinha depois de 30 min (relógio controlado); a sessão que expira no pagamento volta a ele, depois do login, com o que estava preenchido; numa página pública, a sessão expirada abre o login sobre a própria página | `03-auth.spec.ts` | ✅ | ✅³ |
| 4 | Favoritos persistidos, falha de mutation com rollback; visitante entra sem sair do detalhe e o favorito é salvo; dois cliques rápidos com rede lenta terminam no último clique; logado, o favorito funciona enquanto a sessão ainda é confirmada; escritas em fila que falham terminam como o servidor | `04-favorites.spec.ts` | ✅ | ✅ |
| 5 | Carrinho: quantidades, remoção, cupom expirado, inválido e válido, persistência após refresh e login (merge); quantidade acima do estoque restante reduzida passo a passo; sem rolagem lateral a 320 px; total do carrinho = total do pagamento (rede da carteira principal) | `05-cart.spec.ts` | ✅ | ✅ |
| 6 | Compra completa, do catálogo ao recibo confirmado, com o login sobre o carrinho; revisão e recibo cabem em 320 px; o recibo de dois NFTs cabe em 1280×720 (só a lista rola); comprar a última unidade não anuncia, para quem comprou, que ela esgotou | `06-purchase.spec.ts` | ✅ | ✅ |
| 7 | Pagamento recusado, clique repetido, timeout com recuperação do mesmo pedido (relógio controlado, sem esperar os 8 s), mesma chave com corpo diferente → 409; nova tentativa depois da recusa cria outro pedido; com pedido pendente, outra compra é recusada (`ORDER_IN_PROGRESS`); a carteira só conecta numa rede do seu tipo de endereço; 503 na primeira tentativa do pedido: o app repete com a mesma chave e cria um pedido só | `07-payment-failures.spec.ts` | ✅ | ✅ |
| 8 | Perfil (dados, validação, avatar, senha errada não salva nada, nome de usuário em uso com troca de senha não grava nada (perfil e senha vão juntos), senha certa) e carteiras (endereço inválido, principal, secundária) | `08-profile-wallets.spec.ts` | ✅ | ✅ |
| 9 | Preço muda via Socket.IO durante o checkout (aviso, total, bloqueio, aceitar, comprar); edição esgota durante o checkout; na página de pagamento, aceitar preços e remover o cupom não enviam o formulário | `09-realtime-checkout.spec.ts` | ✅ | ✅ |
| 10 | Eventos duplicados e antigos; queda de 3 s com evento perdido e reconciliação REST na volta; pedido pendente + queda do socket + reload sem nova compra; duas abas: preço e logout chegam à outra | `10-realtime-resilience.spec.ts` | ✅ | ✅ |
| 11 | Pular para o conteúdo, foco preso no diálogo e Esc, o login abre no campo de e-mail, foco volta a quem abriu o login e a revisão, erros ligados aos campos; axe (WCAG 2.0 e 2.1, A e AA) em início, detalhe, login, carrinho, perfil, carteiras, favoritos, pagamento com a revisão aberta e recibo | `11-accessibility.spec.ts` | ✅ | ✅¹ |
| 12 | Skeletons em rede lenta, falha 503 com "Tentar novamente", sem conexão; rota privada sem rede mostra o erro, sem loop de login; aba parada continua nos mocks depois que o navegador desliga o service worker; sem rede, a revisão não abre com valores não conferidos | `12-loading-and-failures.spec.ts` | ✅ | ✅ |
| — | Regressão visual: início, detalhe, carrinho e pagamento | `13-visual.spec.ts` | ✅ | ✅ |
| — | Header fixo, item ativo por seção (scroll-spy), itens fora do escopo avisam, Mercado a partir de outra página; header e rodapé em 768 px com usuário logado; "Voltar" num link direto fica no site; item ativo certo ao voltar à home depois de entrar e de comprar; rota 404 parecida não marca Mercado; sem rolagem lateral a 320 px e no perfil a 768 px | `14-navigation.spec.ts` | ✅ | ✅² |
| — | Painel de mocks: rótulos com os dados atuais, ação desabilitada com motivo, axe no painel aberto, Esc, queda com duração escolhida, login rápido; reset volta ao cenário padrão | `15-mock-panel.spec.ts` | ✅ | ✅ |

¹ O teste de foco preso no diálogo de login roda só no desktop: no mobile a
rota `/login` é tela cheia (Figma), sem diálogo.

² O header de navegação é desktop; no mobile a navegação é a tab bar, e só o
"Voltar" sobre a arte do NFT roda no mobile.

³ O "Entrar" do header é desktop: no mobile não há header, e a aba Perfil
leva à tela cheia de login.

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
| Vitest | 17/17 (o teste de dinheiro cobre o valor exato com 10 casas) |
| Playwright, desktop + mobile (Windows, asserts de pixel ignorados), v1.0.8 | 138 passaram + 10 pulados (testes que só fazem sentido num dos viewports), 74 testes por projeto, 3,0 min com `--workers=4` (o padrão do `playwright.config.ts` é 2) |
| Regressão visual (Linux, imagem oficial do Playwright) | 8/8; as baselines desta versão foram geradas pelo próprio workflow (`update-snapshots`) e conferidas na execução seguinte, sem atualizar |
| **CI (GitHub Actions)** — E2E + visual dentro de `mcr.microsoft.com/playwright:v1.64.1-noble`, v1.0.9 | 143 passaram + 11 pulados (testes de um só viewport) em 5,0 min, 77 testes por projeto, com as 8 telas da regressão visual comparadas sem atualizar baseline; `verify` (typecheck, lint, unit, build) e Lighthouse verdes |
| Playwright contra a **URL publicada** (`E2E_BASE_URL`, sem visual), v1.0.8 | 138 passaram + 10 pulados, 3,2 min com `--workers=4` |
| Checkout limpo (`git clone` + `pnpm install --frozen-lockfile`) | typecheck, lint, unit (17/17), build e E2E 06 + 09 (6/6) |
