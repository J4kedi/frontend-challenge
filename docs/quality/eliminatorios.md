# Critérios eliminatórios — conferência

Última revisão: 2026-10-20

O enunciado (§11) lista seis condições que eliminam a entrega. Cada uma tem
aqui a prova no código e o teste que a sustenta.

| Critério eliminatório | Situação | Prova no código | Teste |
| --- | --- | --- | --- |
| Ausência de uso efetivo da stack obrigatória | Atendido | React + TS em todo `src`; TanStack Router nas rotas, na URL e na guarda (`src/routes`); Query em todo dado remoto (`src/features/*/queries.ts`); Axios como único cliente (`src/shared/api/client.ts`); Socket.IO (`src/shared/realtime`); Tailwind 4 com tokens (`src/styles/theme.css`); shadcn/ui (`src/components/ui`); MSW (`src/mocks`); Playwright (`tests/e2e`); Lighthouse (`scripts/lighthouse.mjs`) | toda a suíte E2E |
| Fluxos principais apenas visuais | Atendido | catálogo, carrinho, cotação, pedido, conta e carteiras leem e escrevem no backend simulado com estado (`src/mocks/handlers`); nada é calculado só na tela | 01–10 |
| Compra confirmada sem resposta da simulação | Atendido | o recibo só aparece para `status: 'confirmed'` vindo da API (`OrderPage.tsx`); a confirmação nasce do pagamento simulado (`settle` em `src/mocks/handlers/commerce.ts`) | 06, 07 (recusado não mostra recibo) |
| Exposição de dados entre usuários | Atendido | cache privado sob `['user', id]` e removido no logout e na troca; servidor devolve 403 para pedido ou carteira de outro dono; `order.updated` entregue só ao dono e descartado no cliente se for de outro usuário; 401 atrasado de sessão antiga é ignorado | 03 (troca Ana → Bruno), 10 |
| Eventos simulados diretamente na UI | Atendido | toda mudança simulada passa pela API de controle, que altera o banco e publica pelo servidor Socket.IO (`src/mocks/realtime/server.ts`); o cliente só recebe pelo `socket.io-client` | 09, 10 |
| Ausência de testes E2E executáveis | Atendido | `pnpm test:e2e` sobe build + preview e roda os 12 cenários em desktop e mobile, a partir de um checkout limpo | ver [`testing.md`](testing.md) |
