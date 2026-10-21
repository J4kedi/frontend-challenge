# Desenvolvimento agêntico

Última revisão: 2026-10-20

A vaga pede desenvolvimento agêntico, então este documento registra como a
entrega foi construída: quem decidiu o quê, como o agente trabalhou e como o
trabalho dele foi verificado. Os commits do agente levam
`Co-Authored-By: Claude`, para a autoria ficar visível no histórico.

## Papéis

| Quem | Responsável por |
| --- | --- |
| **Kauan (humano)** | escopo e prazo; prioridades (eliminatórios primeiro, depois a rubrica); decisões de produto e processo: um agente só e em sequência, documentação em Markdown mais página viva, histórico com branch por fatia e PR, autorização para reescrever o histórico inicial; contas externas (GitHub, Vercel, token do Figma) |
| **Claude Code (Opus 5.5)** | plano, implementação, testes, auditorias, documentação e PRs, dentro do contrato do [`AGENTS.md`](../AGENTS.md) |

## Fluxo

1. **Plano antes de código.** A sessão começou em *plan mode*. O plano aprovado definia:
   - a linha de chegada: os seis eliminatórios conferidos, E2E 01–12 verde, deploy funcionando e documentação completa;
   - a ordem pela rubrica;
   - as versões travadas: MSW 2.15 por causa do binding de Socket.IO, TypeScript 6.0 por causa do typescript-eslint;
   - um cronograma com linha de corte.
2. **Fonte de verdade do design pela API do Figma.** Nada foi desenhado "de olho" num print:
   - `scripts/figma-extract.mjs` lê o arquivo na versão fixada;
   - os tokens (cores, estilos de texto, raios e sombras) foram extraídos do JSON do arquivo;
   - frames, artes e ícones foram exportados pela API.
3. **Contratos primeiro.** Os schemas zod (`src/contracts`) vieram antes das telas e servem ao cliente e aos mocks.
4. **Risco técnico primeiro.** O primeiro teste de ponta a ponta foi o mais arriscado: um evento saindo do servidor Socket.IO simulado e chegando à interface. Ele passou antes de qualquer tela ser escrita.
5. **Fatias em branches.** Cada fatia entrou numa branch com commits atômicos e um PR com o que entra, como testar e o que foi verificado, mergeado com merge commit:
   - `feat/catalog`
   - `feat/account`
   - `feat/checkout-realtime`
   - `test/e2e`
   - `docs/architecture-design`
6. **Verificação a cada checkpoint:**
   - `tsc -b`, ESLint e Vitest;
   - screenshots em 1440 e 390 comparados com os renders do Figma;
   - os E2E da fatia.
7. **Auditoria no fim:** axe nos E2E, Lighthouse com mediana de 3 e regressão visual no container Linux.

## O que a verificação automática pegou

A primeira execução completa dos E2E (27/35 no desktop) encontrou defeitos
que passaram pela revisão visual:

- **Contraste dos botões (axe).** O `tailwind-merge` não conhecia a escala tipográfica do Figma e removia a classe de cor quando via `text-body-sm`. A correção foi ensinar a escala ao `cn()`, com um teste unitário para o caso.
- **Layout da conta no mobile.** A grade de uma coluna crescia até a largura da navegação e escondia o botão "Salvar" sob a tab bar.
- Estrutura inválida de `<dl>`, `form` aninhado, ids duplicados e rótulo "Close" em inglês.

Cada correção virou um commit `fix(...)` com o motivo na mensagem. O teste
que pegou o defeito ficou na suíte.

## O que o teste humano pegou depois da entrega

Com a demo publicada, o Kauan usou o app como um avaliador usaria. Cada
relato virou causa raiz, correção e um teste que fixa o comportamento:

| Relato | Causa | Correção e teste |
| --- | --- | --- |
| O header some ao rolar e "Mercado" não fica marcado | header no fluxo da página; o `Link` do router marca `aria-current` em `/` | header fixo com scroll-spy (`14-navigation.spec.ts`) |
| Favoritar no detalhe "vai para o início" | o visitante era levado a `/login`, que no desktop mostra o modal sobre a home | login sobre a própria página e favorito salvo ao entrar (`04-favorites.spec.ts`) |
| O X do login aberto pelo carrinho não fecha | fechar navegava para o `redirect` (`/checkout`), rota privada que devolve ao login | fechar volta pela pilha do histórico (`03-auth.spec.ts`) |
| "Derrubar a conexão" some em 1 s | a reconexão automática do Socket.IO volta em ~0,5 s | servidor fora do ar pelo tempo escolhido; o teste prova evento perdido e recuperação pelo REST (`10`, `15`) |
| O painel de mocks precisa de mais UI/UX e de detalhe por ação | rótulos genéricos ("1º item do carrinho") | seções, rótulos com o dado real, descrição do efeito, login rápido e axe no painel (`15-mock-panel.spec.ts`) |
| No carrinho, "Conectar e finalizar" abre o login sobre a home | a correção do favoritar tratou o sintoma: o carrinho e o "Entrar" do header ainda levavam à rota `/login`, que no desktop mostra a home atrás | todo link que pede sessão abre o login sobre a página atual (`promptVisitor`); a busca pela causa passou a cobrir todos os caminhos até `/login` (`03`, `06`) |

## Varredura com agentes sem contexto

Antes do envio, dois agentes sem o histórico da sessão olharam a entrega, cada
um num clone limpo:

- **Caçador de bugs:** escreveu 7 arquivos de specs exploratórios contra a
  URL publicada, fora do que a suíte cobria. Confirmou 8 defeitos, cada um
  reproduzido pelo menos duas vezes.
- **Avaliador:** seguiu os critérios do enunciado. Os 6 eliminatórios
  passaram, a nota foi 81/100, e ele confirmou mais 4 defeitos.

| Achado | Causa | Correção e teste |
| --- | --- | --- |
| "Tentar novamente" depois da recusa devolve o mesmo pedido recusado | mesmo carrinho e mesma cotação reaproveitavam a chave de idempotência | tentativa recusada é descartada (`07`) |
| Sem rede, rota privada fica em branco num loop `/favorites` ↔ `/login` | o guard tratava erro de rede como "sem sessão" | só 401 vai ao login; o resto mostra o erro (`12`) |
| Item acima do estoque não diminui | o mock validava cada passo contra o estoque | diminuir sempre é aceito (`05`) |
| Dois cliques rápidos no favorito com rede lenta terminam favoritados | PUT e DELETE em paralelo, chegando invertidos | escritas em fila (`04`) |
| Header estoura a 768 px com usuário logado; newsletter truncada | espaçamentos de desktop no tablet | espaçamento e linha própria abaixo de `lg` (`14`) |
| `?page=99` mostra "nenhum NFT, limpe os filtros" | sem tratamento de página além da última | aviso e link para a última página (`01`) |
| Esc no login do header deixa o foco no `body` | o Radix devolve o foco ao `Dialog.Trigger`, e o login no lugar não tem um | o login lembra quem o abriu (`11`) |
| "Voltar" no mobile sai do site num link direto | `history.back()` sem histórico do app | volta ao mercado quando não há histórico (`14`) |
| Carrinho mobile sem margem direita; estouro a 320 px | grid de uma coluna sem `minmax(0, 1fr)` | `grid-cols-1` (`05`, baseline visual) |
| Valores do resumo quebram linha | coluna de 332 px | valores sem quebra |
| Carteira conectada junto com "Conecte a carteira" | erro gravado durante a conexão pendente | sucesso limpa o erro |

### Segunda rodada

Os mesmos papéis rodaram de novo sobre a v1.0.5:

- **Avaliador:** 82/100, com os eliminatórios passando.
- **Caçador de bugs:** 11 defeitos novos.
- **Teste manual do Kauan:** mais 2 defeitos, os 404 com a aba parada e o header na home.

A fidelidade fina que tinha ficado de fora entrou nesta rodada: placa dos
cards, grid escalonado e selo "RARO" no mobile, placa da galeria e hero. Os
valores foram tirados do JSON do arquivo Figma.

| Achado | Causa | Correção e teste |
| --- | --- | --- |
| Aba parada: toda chamada `/api/*` dá 404 | o navegador desliga o service worker ocioso, e o worker do MSW esquece a aba ao reiniciar | a aba se registra de novo depois de 20 s sem requisições (`12`, com o worker desligado via CDP) |
| Depois de comprar, "Mercado" fica ativo na home mesmo clicando "Início" | o scroll-spy procurava `#mercado` antes de a home renderizar e desistia | espera a seção aparecer (`14`) |
| Voltar logo depois de confirmar cobra o carrinho de novo | o mock aceitava outro pedido enquanto o primeiro estava pendente | `409 ORDER_IN_PROGRESS` e lista de pendentes atualizada (`07`) |
| Logado, o favorito abre o login logo após um reload | a sessão guardada ainda não tinha sido confirmada | espera a confirmação; placeholder no header (`04`) |
| Duas abas: pedido some, logout e preço não chegam à outra | cada aba tinha seu banco em memória e seu servidor de eventos | banco sincronizado por `storage`, eventos por `BroadcastChannel`, reload na troca de sessão (`10`) |
| Foco no `body` ao fechar a revisão e o explorador | diálogos abertos por código, sem `Dialog.Trigger` | o `DialogContent` compartilhado devolve o foco a quem o abriu (`11`) |
| Estouro a 320 px na home, na revisão e no recibo, e a 768 px no perfil | grids sem coluna explícita, linha do avatar sem quebra | `grid-cols-1`, quebra e padding menor (`06`, `14`) |
| Total do carrinho ≠ total do pagamento na Polygon | o carrinho cotava sempre na Ethereum | cota na rede da carteira principal (`05`) |
| Cupom usado continua no carrinho seguinte | a confirmação não limpava o cupom | limpo ao confirmar |
| "Mercado" ativo em 404 como `/nftx` | `startsWith` sem fronteira de segmento | só o próprio segmento (`14`) |
| Mobile: tab bar no carrinho, no pagamento e no login, sem voltar no pagamento | divergência dos frames | segue os frames |
| Teste 04 escolhia o NFT com um hash diferente do mock | o mock faz o hash do JSON da string | mesmo cálculo |

Também saíram duas dependências sem uso (`cn` e `next-themes`), e cinco
`waitForTimeout` viraram esperas por condição: respostas pendentes,
histórico de valores com um evento sentinela e a contagem regressiva.

Ficaram de fora, com registro:
- **Performance mobile:** 77–88 nas medições, abaixo da meta; a causa está em [`lighthouse.md`](quality/lighthouse.md).
- **Duas abas escrevendo ao mesmo tempo:** ainda vale "a última vence", um limite de um servidor que roda no navegador.

## Contrato para os próximos agentes

O [`AGENTS.md`](../AGENTS.md) (carregado pelo `CLAUDE.md`) é o contrato curto
para qualquer agente que mexa no repositório:

- contratos zod compartilhados;
- mocks só na camada de rede;
- tempo real só pelo socket;
- só tokens do Figma, com um guard automático;
- dinheiro em wei;
- cache privado sob o dono.

Ele também traz os comandos que fecham uma mudança. A documentação de cada
área (`docs/design`, `docs/contracts`, `docs/quality`) é o que um agente deve
ler antes de editar a área.

## Limites do processo

- **Revisão.** A revisão de código foi do próprio agente, apoiada nos testes e auditorias. O agente abriu e mergeou os PRs com autorização do humano, que tomou as decisões de produto e acompanhou o processo.
- **Medições locais.** As medições de Lighthouse são da máquina local, com o ambiente registrado no relatório; números de outra máquina variam.
- **Regressão visual em Linux.** As baselines visuais valem para Linux. Em outro SO, a comparação roda pelo container (`pnpm test:visual`).
