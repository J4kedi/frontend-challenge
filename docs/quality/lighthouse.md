# Lighthouse

Última revisão: 2026-10-21

## Como medir

```bash
pnpm lighthouse                                     # build + vite preview + 3 execuções por página e perfil
LH_RUNS=1 pnpm lighthouse                           # conferência rápida
LH_PAGES=inicio LH_PROFILES=mobile pnpm lighthouse  # uma página ou um perfil
LH_ORIGIN=https://kurio-nft-marketplace-vert.vercel.app pnpm lighthouse  # a demo publicada, sem build
```

Configuração versionada em [`scripts/lighthouse.mjs`](../../scripts/lighthouse.mjs):

- **Build:** o build de demonstração (mocks ligados), o mesmo que é publicado. Por padrão, servido pelo `vite preview`; com `LH_ORIGIN`, a URL informada.
- **Páginas:** início (`/`) e detalhe (`/nft/emerald-ape-042`).
- **Perfil mobile:** padrão do Lighthouse, com 4G lento simulado e CPU 4×.
- **Perfil desktop:** `desktop-config` do Lighthouse.
- **Execuções:** 3 por página e perfil, cada uma num Chrome novo (cache, storage e service worker vazios, como numa primeira visita). O valor reportado é a mediana de cada categoria. Um Chrome headless que cai, ou que nem chega a abrir, é relançado uma vez.
- **Saída:**
  - relatórios HTML e JSON de cada execução em [`reports/lighthouse/`](../../reports/lighthouse/);
  - medianas em [`summary.md`](../../reports/lighthouse/summary.md) e [`summary.json`](../../reports/lighthouse/summary.json), com ambiente e versões.
- **CI:** o job `Lighthouse` do workflow roda o script em todo PR, sobre o build. Disparado à mão com `lighthouse-origin`, ele audita a URL publicada. Os relatórios ficam como artefato da execução.

No Windows, o clone precisa estar num caminho curto: os arquivos do Lighthouse em `node_modules/.pnpm` passam do limite de 260 caracteres quando o projeto fica fundo (por exemplo, em pastas temporárias), e o import quebra com `does not provide an export named 'default'`. Habilitar caminhos longos no Windows também resolve.

Nenhuma simplificação é exclusiva da auditoria: as mesmas imagens, fontes, mocks, painel de mocks e tempo real da demo publicada são carregados.

## Resultado (mediana de 3)

Medido no runner Linux do GitHub Actions, uma máquina limpa que não roda mais nada durante a auditoria. Ferramentas: Lighthouse 13.5.0, Chrome 155, Node 22. Versão auditada: v1.0.9, em 2026-10-21.

### Demo publicada (Vercel)

Os relatórios versionados em `reports/lighthouse/` são desta medição.

| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início | mobile | **93** | 100 | 100 | 100 | 2 803 ms | 0 | 154 ms |
| Início | desktop | **100** | 100 | 100 | 100 | 590 ms | 0 | 4 ms |
| Detalhe | mobile | **94** | 100 | 100 | 100 | 2 582 ms | 0 | 145 ms |
| Detalhe | desktop | **100** | 100 | 100 | 100 | 581 ms | 0 | 0 ms |

Metas: Performance ≥ 90, Acessibilidade ≥ 95, Boas práticas ≥ 95, SEO ≥ 90. **Todas atingidas, nos dois perfis e nas duas páginas.**

A primeira execução de cada sequência é a mais lenta (início mobile: 74, com TBT de 737 ms): o runner ainda está frio. As duas seguintes deram 93 e 93, e a mediana descarta a fria. Na v1.0.8, o mesmo job deu 92 e 95 no mobile.

### Build servido pelo `vite preview`

| Página | Perfil | Performance | LCP | TBT |
| --- | --- | ---: | ---: | ---: |
| Início | mobile | 86 | 3 759 ms | 133 ms |
| Início | desktop | 99 | 836 ms | 3 ms |
| Detalhe | mobile | 84 | 3 695 ms | 164 ms |
| Detalhe | desktop | 99 | 859 ms | 0 ms |

**Por que o mesmo build tira menos no `vite preview`.** O preview serve em HTTP/1.1, que limita o navegador a 6 conexões por origem, e o primeiro carregamento tem cerca de 25 arquivos JS. A Vercel serve em HTTP/2: uma conexão, tudo em paralelo. Na simulação de 4G lento, a fila de conexões soma cerca de 1 s ao LCP. O TBT, que depende só do main thread, é parecido nos dois.

Numa máquina de desenvolvimento ocupada com outras coisas, os números caem: a simulação multiplica por 4 o tempo de CPU observado, e o TBT é o mais sensível. Por isso a medição de referência é a do CI. Os avaliadores sem contexto mediram na própria máquina, com outras sessões rodando: 69 a 86 no início mobile na v1.0.7 e, na v1.0.9, medianas de 82 no início e 88 no detalhe (CPU com média de 28% e picos de 67% durante a medição). O LCP deles bate com o do CI (2,6 a 2,9 s); o que muda é o TBT, 3 a 4 vezes maior.

## Antes e depois

### Rodada 4 (v1.0.7 → v1.0.8), mesmo job do CI

| Página (mobile) | Demo publicada | LCP | TBT | Build no preview | TBT |
| --- | --- | --- | --- | --- | --- |
| Início | 91 → **92** | 2 681 → 2 861 ms | 232 → **177 ms** | 83 → **86** | 190 → **133 ms** |
| Detalhe | 93 → **95** | 2 651 → 2 572 ms | 172 → **126 ms** | 84 → 84 | 192 → **164 ms** |

O "antes" é a v1.0.7, medida com o mesmo script e o mesmo job (o runner trocou de CPU entre as medições do preview: Xeon 8370C antes, EPYC 9V74 depois). O LCP do início oscila entre 2,6 e 3,1 s de uma execução para outra, nas duas versões.

O que mudou, em ordem de efeito:

1. **Um layout do hero por viewport.** O hero de desktop ficava escondido por CSS no celular, mas a arte prioritária dele (o arquivo de 1080 px) ainda baixava. O card do LCP reaproveitava esse arquivo em vez do de 360 px pré-carregado. Agora só o layout do viewport atual vai para o DOM, e o LCP usa o arquivo pré-carregado.
2. **zod sem JIT.** O zod compilava um parser por schema (`new Function`) na primeira validação, uma tarefa longa logo depois da primeira resposta. Cada schema daqui valida poucas respostas, então interpretar sai mais barato (`contracts/common.ts`).
3. **Grade de cards em transição.** Com `useDeferredValue`, o React monta a grade em fatias em vez de uma tarefa longa quando o catálogo chega.
4. **Sidebar só a partir de `lg`.** Abaixo disso, filtros e NFT em destaque renderizavam escondidos e buscavam `highlights` à toa.
5. **Painel de mocks quando o navegador fica ocioso.** O chunk dele saiu da carga da página.
6. **Arte inset no detalhe mobile (Figma).** A arte ocupa a largura menos 56 px, e o celular baixa o arquivo de 720 px em vez do de 1080 px.

Testado e revertido: carregar as rotas de entrada (início e detalhe) junto com o bundle principal, sem code-splitting. O TBT subiu, porque o `main.js` ficou maior numa tarefa só, e o LCP não mudou.

### Rodadas anteriores (máquina local, Windows)

| Página (mobile) | Performance | LCP | TBT | Acessibilidade | SEO |
| --- | --- | --- | --- | --- | --- |
| Início | 65 → 82 | 5 054 → 3 932 ms | 304 → 175 ms | 96 → 100 | 92 → 100 |
| Detalhe | 71 → 86 | 4 688 → 3 542 ms | 240 → 171 ms | 100 → 100 | 92 → 100 |

O que mudou naquela rodada:

1. **Shim do `tough-cookie` no MSW.** O MSW carregava `tough-cookie` e a lista de sufixos públicos (`tldts`) só para repassar `Set-Cookie` de respostas simuladas. A API simulada não usa cookie (sessão por bearer token), então o pacote virou um shim sem efeito (`src/mocks/shims/tough-cookie.ts`). O chunk de mocks caiu de **172 KB para 52 KB** gzip.
2. **Transporte em paralelo** (`src/boot.ts` → `src/app/transport.ts`). O MSW começa a baixar e avaliar antes do bundle do app, não depois dele.
3. **Preload da arte do LCP por viewport**, com o mesmo `srcset`/`sizes` dos `<img>`: o hero no desktop e o primeiro card no mobile.
4. **Acessibilidade:** os pontos do carrossel ganharam alvo de toque de 24 px (o ponto visual não mudou).
5. **SEO:** `robots.txt` válido (antes o preview devolvia o HTML do SPA).

## Onde está o tempo que sobra no mobile

Os números vêm de `reports/lighthouse/inicio-mobile-*.report.json`, insight `lcp-breakdown`.

- **O elemento de LCP no mobile é a primeira imagem do catálogo.** Ele depende de dado: só existe depois de (a) o JS do app rodar, (b) o MSW registrar e ativar o service worker numa primeira visita e (c) a API simulada responder com a latência do cenário padrão (60–180 ms). A imagem em si já está pré-carregada; o tempo está no *element render delay*, a tela esperando o dado.
- **Custo de CPU da stack obrigatória sob CPU 4×.** React DOM, TanStack Router e Query, zod (validação de toda resposta) e Axios somam ~190 KB gzip no carregamento inicial.

O que ainda daria pontos, e por que não foi feito:

| Opção | Por que não |
| --- | --- |
| Tirar o service worker do caminho crítico (ex.: renderizar o catálogo do cache antes do MSW) | criaria um caminho de dados fora da camada de rede, o que o enunciado veda |
| Reduzir a latência do cenário padrão só na auditoria | simplificação exclusiva para a nota, vetada pelo enunciado |
| Trocar `zod` por `zod/mini` | ganho estimado de ~25 KB gzip; reescreve todos os contratos. Fica como próximo passo |
| SSR ou pré-render do catálogo | muda a arquitetura (o desafio é SPA com Vite) |
