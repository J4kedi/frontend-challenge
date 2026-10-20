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
