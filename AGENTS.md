# Kurio — contrato para agentes

Contrato curto para qualquer agente (Claude Code, Codex, Cursor) que trabalhe
neste repositório. O enunciado do desafio está em [`docs/challenge.md`](docs/challenge.md)
e é a fonte de verdade de escopo. O processo usado para construir a entrega
está em [`docs/agentic-development.md`](docs/agentic-development.md).

## Antes de editar

1. Leia o enunciado, o [`ARCHITECTURE.md`](ARCHITECTURE.md) e a documentação da área:
   - UI, tokens, componentes: [`docs/design/README.md`](docs/design/README.md);
   - REST e eventos: [`docs/contracts/`](docs/contracts/);
   - testes e auditoria: [`docs/quality/`](docs/quality/).
2. Confirme se o que vai escrever já existe (componente, hook, util, schema).
   Reuse antes de criar.

## Regras

- **Contratos primeiro.** Todo dado que cruza a rede tem schema zod em
  `src/contracts`. Cliente e mocks usam o mesmo schema; mudar um contrato muda
  os dois lados no mesmo commit.
- **Mocks só na camada de rede.** Componentes, hooks e o cliente Axios não têm
  resposta fictícia nem caminho alternativo de negócio. Cenários, latência e
  falhas ficam em `src/mocks`.
- **Tempo real passa pelo socket.** Mudança simulada vai pela API de controle
  (`/api/__mock/*`), que altera o banco simulado e publica o evento. Nunca chame
  setter, callback ou cache direto para simular evento.
- **Tokens do Figma, sem valor solto.** Cor, fonte, raio e sombra vêm de
  `src/styles/theme.css`. O teste `design-tokens.test.ts` reprova hex cru em
  `.tsx`.
- **ETH é string decimal.** Conta em `src/shared/lib/money.ts` (BigInt wei).
  Nunca `Number()` em valor monetário.
- **Dado privado fica sob o dono.** Query keys privadas começam com
  `['user', id]` ou `['guest', cartId]`; logout remove o prefixo inteiro.
- **Acessibilidade não é opcional.** Label em todo campo, erro ligado por
  `aria-describedby`, foco visível, `announce()` para mudança assíncrona.

## Fechar uma mudança

```bash
pnpm typecheck && pnpm lint && pnpm test:unit && pnpm build
pnpm test:e2e            # fluxos; visual só em Linux/CI
```

Atualize a doc da área no mesmo commit quando o comportamento mudar.
Commits atômicos, em inglês, no formato `type(scope): resumo`.
