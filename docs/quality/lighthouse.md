# Lighthouse

Última revisão: 2026-10-20

## Como medir

```bash
pnpm lighthouse              # build + vite preview + 3 execuções por página e perfil
LH_RUNS=1 pnpm lighthouse    # conferência rápida
```

Configuração versionada em [`scripts/lighthouse.mjs`](../../scripts/lighthouse.mjs):

- **Build:** o build de demonstração (mocks ligados), o mesmo publicado, servido pelo `vite preview`.
- **Páginas:** início (`/`) e detalhe (`/nft/emerald-ape-042`).
- **Perfil mobile:** padrão do Lighthouse, com 4G lento simulado e CPU 4×.
- **Perfil desktop:** `desktop-config` do Lighthouse.
- **Execuções:** 3 por página e perfil, cada uma num Chrome novo (cache, storage e service worker vazios, como numa primeira visita). O valor reportado é a mediana de cada categoria.
- **Saída:**
  - relatórios HTML e JSON de cada execução em [`reports/lighthouse/`](../../reports/lighthouse/);
  - medianas em [`summary.md`](../../reports/lighthouse/summary.md) e [`summary.json`](../../reports/lighthouse/summary.json), com ambiente e versões.

Nenhuma simplificação é exclusiva da auditoria: as mesmas imagens, fontes,
mocks, painel de mocks e tempo real da demo publicada são carregados.

## Resultado (mediana de 3)

Ambiente:
- ferramentas: Lighthouse 13.5.0, Chrome 155, Node 24.14;
- máquina: Windows 11, Intel Core Ultra 7 155H, 32 GB;
- data: 2026-10-20.

| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início | mobile | **82** | 100 | 100 | 100 | 3 932 ms | 0 | 175 ms |
| Início | desktop | 99 | 100 | 100 | 100 | 970 ms | 0,002 | 10 ms |
| Detalhe | mobile | **86** | 100 | 100 | 100 | 3 542 ms | 0 | 171 ms |
| Detalhe | desktop | 99 | 100 | 100 | 100 | 845 ms | 0 | 0 ms |

Metas: Performance ≥ 90, Acessibilidade ≥ 95, Boas práticas ≥ 95, SEO ≥ 90.
As metas são atingidas em todas as categorias e perfis, **exceto Performance
no mobile** (82 e 86).

## Antes e depois

"Antes" é a primeira medição (1 execução, mesmo ambiente). "Depois" é a mediana acima.

| Página (mobile) | Performance | LCP | TBT | Acessibilidade | SEO |
| --- | --- | --- | --- | --- | --- |
| Início | 65 → **82** | 5 054 → 3 932 ms | 304 → 175 ms | 96 → 100 | 92 → 100 |
| Detalhe | 71 → **86** | 4 688 → 3 542 ms | 240 → 171 ms | 100 → 100 | 92 → 100 |

O que mudou, em ordem de efeito:

1. **Shim do `tough-cookie` no MSW.** O MSW carregava `tough-cookie` e a lista de sufixos públicos (`tldts`) só para repassar `Set-Cookie` de respostas simuladas. A API simulada não usa cookie (sessão por bearer token), então o pacote virou um shim sem efeito (`src/mocks/shims/tough-cookie.ts`). O chunk de mocks caiu de **172 KB para 52 KB** gzip.
2. **Transporte em paralelo** (`src/boot.ts` → `src/app/transport.ts`). O MSW começa a baixar e avaliar antes do bundle do app, não depois dele.
3. **Preload da arte do LCP por viewport**, com o mesmo `srcset`/`sizes` dos `<img>`: o hero no desktop e o primeiro card no mobile.
4. **Acessibilidade:** os pontos do carrossel ganharam alvo de toque de 24 px (o ponto visual não mudou).
5. **SEO:** `robots.txt` válido (antes o preview devolvia o HTML do SPA).

## Por que o mobile fica abaixo de 90

Os números vêm de `reports/lighthouse/inicio-mobile-*.report.json`, insight `lcp-breakdown`.

- **O elemento de LCP no mobile é a primeira imagem do catálogo.** Ele depende de dado: só existe depois de (a) o JS do app rodar, (b) o MSW registrar e ativar o service worker numa primeira visita e (c) a API simulada responder com a latência do cenário padrão (60–180 ms). A imagem em si carrega rápido, porque está pré-carregada. O tempo está no *element render delay*: a tela espera o dado.
- **Custo de CPU da stack obrigatória sob CPU 4×.** React DOM, TanStack Router e Query, zod (validação de toda resposta) e Axios somam ~190 KB gzip no carregamento inicial; o main thread passa de 1 s de script na simulação mobile.
- No desktop, o mesmo build tira 99. A diferença é só a simulação de CPU e rede do perfil mobile.

O que daria os pontos que faltam, e por que não foi feito:

| Opção | Por que não |
| --- | --- |
| Tirar o service worker do caminho crítico (ex.: renderizar o catálogo do cache antes do MSW) | criaria um caminho de dados fora da camada de rede, o que o enunciado veda |
| Reduzir a latência do cenário padrão só na auditoria | simplificação exclusiva para a nota, vetada pelo enunciado |
| Trocar `zod` por `zod/mini` | ganho estimado de ~25 KB gzip; reescreve todos os contratos. Fica como próximo passo |
| SSR ou pré-render do catálogo | muda a arquitetura (o desafio é SPA com Vite) |
