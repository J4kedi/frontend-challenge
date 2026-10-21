# Componentes — catálogo

Última revisão: 2026-10-20

Formato de cada entrada: **Arquivo**, **Figma** (componente ou nó de origem),
**Uso**, **Estados**, **A11y**, **Guidelines**. Antes de criar um componente,
procure aqui: a regra é reusar.

## Regras gerais

- Primitivos em `src/components/ui` (shadcn/ui restilizado); componentes de domínio em `src/features/<fatia>/components`.
- Estilo só com tokens ([`tokens.md`](tokens.md)); o guard `design-tokens.test.ts` reprova valor solto.
- Todo componente que depende de dado tem skeleton com as dimensões finais (sem CLS) e estado de erro com "Tentar novamente".
- Todo controle tem nome acessível; ícones são `aria-hidden` e quem carrega o nome é o botão ou o link.

<a id="cn"></a>
### `cn()`

Arquivo: `src/shared/lib/cn.ts`. Faz o merge de classes (`clsx` + `tailwind-merge`)
**configurado com a escala tipográfica do Figma**. Sem essa configuração,
`text-body-sm` parece uma cor para o tailwind-merge, e a cor real do botão
some. O teste do axe pegou exatamente isso (ver `cn.test.ts`).

## Layout

### AppShell
- **Arquivo:** `src/components/layout/AppShell.tsx`
- **Uso:** casca de todas as rotas: link "Pular para o conteúdo", Header, aviso de tempo real (fixo sob o header, visível em qualquer rolagem), `<main id="conteudo">`, Footer, TabBar mobile, Toaster, LiveRegion, o login em contexto e o painel de mocks (os dois lazy).
- **A11y:** o skip link é o primeiro foco; o `main` recebe foco programático.

### SiteHeader
- **Arquivo:** `src/components/layout/SiteHeader.tsx` · **Figma:** `Header With Divider`, `Header Row` (Active=Home / Active=Market)
- **Uso:** desktop e tablet (`md+`), **fixo no topo** (`sticky`). Logo, navegação (Início, Mercado, Criadores, Aprenda), busca, carrinho com contador e Entrar/usuário.
- **Estados:**
  - item ativo em `accent` com sublinhado `primary` e `aria-current="page"`;
  - na home, o ativo segue a seção na tela (scroll-spy com `useSectionInView`): no mercado, **Mercado**; acima dele, **Início**;
  - em detalhe, carrinho, pagamento e pedido, fica **Mercado**;
  - Criadores e Aprenda aparecem esmaecidos (`aria-disabled`) e, ao clicar, avisam que não fazem parte da demonstração.
- **Guidelines:**
  - Início e Mercado são âncoras próprias (`SectionLink`), não `<Link>`: o `<Link>` do router sempre se marca ativo em `/`, o que brigaria com o scroll-spy;
  - clicar no item da página atual rola até a seção; Ctrl+clique abre em nova aba;
  - `scroll-padding-top` no `html` impede que foco ou âncora fiquem sob o header fixo;
  - toasts ficam embaixo, para nunca cobrir o header;
  - o contador do carrinho é a soma das quantidades, e o link anuncia "Carrinho, N itens".

### MobileTabBar
- **Arquivo:** `src/components/layout/MobileTabBar.tsx` · **Figma:** `Tab Bar` (Mobile / Início)
- **Uso:** navegação inferior fixa no mobile: Início, Lista de interesse, busca (botão central), Carrinho e Perfil. Não aparece no detalhe, no carrinho, no pagamento nem no login, porque os frames dessas telas não têm tab bar.
- **Forma:** barra na cor de card com cantos superiores de 30 px e o recorte curvo sob o botão central, como no Figma. O recorte é uma peça SVG de largura fixa (126 px): botão de 65 px, berço de raio 44 px e ombros de 14 px, medidos no frame. As laterais esticam, então a curva não deforma em nenhuma largura. Sombra `drop-shadow-tab-bar`, que segue o recorte.
- **A11y:** `nav` com rótulo; `scroll-padding-bottom` no `html` evita que um elemento focado fique escondido sob a barra (WCAG 2.4.11).

### SiteFooter
- **Arquivo:** `src/components/layout/SiteFooter.tsx` · **Figma:** `Footer`
- **Uso:** desktop. Links reais (perfil, lista de interesse, coleções filtradas); os de páginas editoriais aparecem como indisponíveis (`aria-disabled`, "Em breve"). A newsletter avisa que não faz parte da demonstração, em vez de fingir sucesso.

### Breadcrumb
- **Arquivo:** `src/components/layout/Breadcrumb.tsx` · **Figma:** trilha "Início / Mercado / …"
- **A11y:** `nav` "Trilha de navegação" com `ol`; o último item tem `aria-current="page"`.

### NotFoundPage · ErrorState · RouteErrorPage
- **Arquivo:** `src/components/feedback/StatusPage.tsx` · **Figma:** não desenhado (segue o padrão das telas)
- **Uso:** 404 (rota, NFT, pedido), erro inline com "Tentar novamente" e erro de rota.
- **A11y:** o erro inline é `role="alert"`.

## Primitivos (shadcn/ui adaptado)

### Button
- **Arquivo:** `src/components/ui/button.tsx` · **Figma:** EXPLORAR, Entrar, COMPRAR, Aplicar, Salvar, Confirmar compra
- **Variantes:** `default` (laranja, texto ink), `outline` (borda laranja), `secondary`, `ghost`, `destructive`, `link`.
- **Tamanhos:** `default` 40 px · `sm` 32 · `lg` 48 · `pill` 60 (CTAs mobile) · `icon` · `icon-lg`.
- **Estados:** hover em `accent`, `disabled` com 50% de opacidade e `aria-busy` com cursor de progresso. Em ação assíncrona, o rótulo muda ("Enviando pedido…").
- **Tipo:** `button` por padrão. Num formulário, só o botão declarado com `type="submit"` envia; "Remover" (cupom) e "Aceitar novos preços", que ficam dentro do formulário de pagamento, não enviam.

### Input · PasswordInput · FormField · FormError
- **Arquivos:** `src/components/ui/input.tsx`, `src/components/form/*`
- **Figma:** campos dos formulários de Login, Cadastro, Perfil, Carteiras e Pagamento (`Password Input` com o olho)
- **Uso:** `FormField` cuida de label, controle, dica e erro. Com `hideLabel`, mantém o label só para leitor de tela quando o Figma mostra apenas placeholder.
- **A11y:** `aria-invalid`, `aria-describedby` (erro e dica) e asterisco `aria-hidden`; o "obrigatório" vai em `aria-required`. O olho alterna `aria-pressed`.
- **Guidelines:** erros da API chegam pelos campos com `applyServerErrors`, que também foca o primeiro.

### QuantityStepper
- **Arquivo:** `src/components/ui/quantity-stepper.tsx` · **Figma:** − 1 + (Detalhes, Carrinho)
- **Estados:** botões desabilitados nos limites (estoque ou limite por pedido). O valor fica em `<output aria-live>`.

### Skeleton
- **Arquivo:** `src/components/ui/skeleton.tsx` + utility `skeleton` em `theme.css`
- **Guidelines:** sempre com as dimensões do conteúdo final; shimmer desligado com `prefers-reduced-motion`.

### Select · Sheet · Dialog · Slider · Checkbox · Tabs · Toaster
- **Arquivos:** `src/components/ui/*`
- **Ajustes:** cores do hover e do foco nos tokens, polegar do slider laranja com `thumbLabels` (nome acessível por polegar), botão de fechar "Fechar" em pt-BR e Toaster sem `next-themes` (tema único).

## Catálogo

### NftImage
- **Arquivo:** `src/features/catalog/components/NftImage.tsx`
- **Uso:** `<picture>` com AVIF e fallback WebP (360, 720 e 1080 px), `width`/`height` fixos (quadrado). `priority` aplica `fetchpriority="high"` e `loading="eager"`.

### NftCard · NftCardSkeleton
- **Arquivo:** `src/features/catalog/components/NftCard.tsx` · **Figma:** item do `Product Grid`
- **Estados:** preço anterior riscado (com "Preço anterior" para leitor de tela), "Esgotado" e coração sobreposto no mobile.
- **A11y:** o link do card tem o nome do NFT e `aria-describedby` com o preço; o coração fica fora do link (sem interativo aninhado).

### CatalogFilters
- **Arquivo:** `src/features/catalog/components/CatalogFilters.tsx` · **Figma:** `Sidebar` / `Filters`
- **Uso:** coleções e redes como botões de alternância (`aria-pressed`) com contagem, faixa de preço com "Aplicar". Mesmo componente na sidebar (`lg+`) e no Sheet (mobile e tablet).
- **Estados:** selecionado com barra lateral `primary` e texto `accent`, ou seja, forma além da cor.

### SearchField · TabsFilter · SortSelect · FiltersSheet
- **Arquivo:** `src/features/catalog/components/CatalogToolbar.tsx` · **Figma:** `Search Bar` (mobile), abas "Todos os NFTs / Novos lançamentos / Em alta", "Ordenar por"
- **Guidelines:** a busca não é controlada e tem debounce de 300 ms, então digitar nunca briga com a URL. Uma única busca existe no DOM, conforme o viewport.

### CatalogResults · Pagination
- **Arquivo:** `src/features/catalog/components/CatalogResults.tsx`
- **Estados:** skeleton (primeira carga), página anterior esmaecida com `aria-busy` (carregando a próxima), vazio com "Limpar filtros" e erro com "Tentar novamente". "N NFTs encontrados" em `role="status"`.

### HomeHero · FeaturedNft · PromoCards · BlogSection
- **Arquivos:** `HomeHero.tsx`, `HomeEditorial.tsx` · **Figma:** `Hero`/`Hero Banner`, `NFT em destaque`, `Promo Card — Genesis Drops / Curated Art`, `Blog`
- **Guidelines:** carrossel sem autoplay, com pontos acessíveis; "Ler mais" do blog aparece como indisponível (páginas editoriais fora do escopo).
- **Hero Banner (mobile):** 190 px, cantos de 30 px, fundo em degradê de `primary` e os dois círculos decorativos do frame. A arte do slide tem 138 px, e uma segunda arte de 58 px fica sobre o canto inferior esquerdo dela. Só o layout do viewport atual vai para o DOM: um layout escondido ainda baixaria a arte prioritária dele.

## NFT, favoritos e carrinho

### FavoriteButton
- **Arquivo:** `src/features/favorites/FavoriteButton.tsx` · **Figma:** "Favoritar", coração
- **Estados:** coração preenchido (forma) e `aria-pressed`. A troca é otimista, com rollback e toast se a API falhar. Visitante: abre o login sobre a página (ver AuthDialog) e o favorito é salvo logo depois de entrar.
- **Carregando:** logado, enquanto a lista ainda chega, fica desabilitado com `aria-busy`: o estado é desconhecido, não "fora da lista".
- **No card:** no celular e em telas de toque, sempre visível. No desktop com mouse, aparece no hover e no foco (o hover do card no Figma) e fica visível depois de favoritado, o que dá o "remover" da lista de interesse.

### EditionPicker · PurchasePanel · Gallery
- **Arquivo:** `src/features/nft/NftDetailPage.tsx` · **Figma:** "Edição: 1/1 · 1/10 · 1/50 · ABERTA", galeria com zoom; no mobile, "Hero", "Details Sheet" e "Buy Bar"
- **Mobile, como no frame:**
  - voltar e favoritar (35 px) ficam acima da arte, que é inset com raio 24 e tem os pontos da galeria sobre ela;
  - o painel de detalhes tem raio 31 e cobre 30 px da arte;
  - ID do token, coleção e atributos vêm logo depois das edições;
  - quantidade, preço, "Comprar NFT" e o carrinho ficam numa barra fixa embaixo, com raio 40;
  - sem tab bar.
- **A11y:** edições formam um radio group (setas navegam), e a esgotada vem riscada e com "esgotada" no nome. Os pontos da galeria são botões com nome ("Ver imagem 2 de 4") e `aria-pressed`.

### QuoteTotals · CouponForm · QuoteNotice
- **Arquivos:** `src/features/cart/components/*` · **Figma:** "Resumo da carteira"
- **Guidelines:** os valores vêm só da cotação da API. O cupom é um `group`, não um `form`, porque também vive dentro do formulário de pagamento. O aviso de mudança tem "Aceitar novos preços".

## Pagamento, pedido e conta

### AuthDialog · LoginPrompt
- **Arquivo:** `src/features/auth/AuthScreen.tsx` · **Figma:** "Desktop / Login", "Desktop / Cadastro" (modal com abas "Entrar | Criar conta" e borda inferior laranja)
- **Uso:** o mesmo modal serve às rotas `/login` e `/signup` (sobre o marketplace, como no Figma) e ao `LoginPrompt`, que abre sobre a página atual quando o visitante pede login a partir dela: favoritar, "Conectar e finalizar" no carrinho ou "Entrar" no header. No prompt, as abas trocam o formulário no lugar, sem navegar.
- **Estados:** sessão expirada (aviso âmbar), erro de credencial (`role="alert"`), enviando (`aria-busy`). Na demo, uma dica de conta de teste com **Preencher**.
- **Guidelines:** fechar volta para a página anterior; o sucesso segue para o `redirect` (rotas) ou retoma a ação interrompida (prompt).

### CheckoutPage · WalletChooser · ConnectionStatus · ReviewDialog
- **Arquivos:** `src/features/checkout/*` · **Figma:** "Desktop / Pagamento", "Mobile / Pagamento" (revisão não desenhada; segue o modal de confirmação)
- **Estados da conexão:** desconectada, "Aguardando aprovação na carteira…", conectada (ponto verde e texto) e recusada (`role="alert"`).

### Receipt
- **Arquivo:** `src/features/orders/OrderPage.tsx` · **Figma:** `Order Confirmation Modal` + ilustração `thank-you` exportada do arquivo
- **Estados:** pendente (spinner), recusado e confirmado. O "Ver no Etherscan" abre um diálogo que explica a transação simulada.

### AccountLayout · EnsInput · WalletForm
- **Arquivos:** `src/features/account/*` · **Figma:** sidebar "Meu perfil", "Nome ENS (.eth)", formulário de carteira
- **Guidelines:** os itens fora do escopo da sidebar aparecem indisponíveis no desktop e somem no mobile, onde a navegação vira lista horizontal.

## Infra de interface

### LiveRegion / `announce()`
- **Arquivo:** `src/shared/a11y/announcer.tsx`
- **Uso:** uma região `aria-live="polite"` para mutations e eventos de tempo real (preço mudou, pedido confirmado, cupom aplicado).

### MockPanel
- **Arquivo:** `src/mocks/panel/MockPanel.tsx` (camada de mocks, lazy)
- **Uso:** demonstração, em seções: Cenário, Tempo real, Carrinho, Conta e Dados. Só fala com a API de controle (`/api/__mock/*`) e com os hooks do app (sessão, carrinho, status do socket). Nos testes visuais, fica oculto (`[data-mock-panel]`).
- **Estados:** cada ação tem título com o dado que vai tocar ("Subir o preço de Emerald Ape #042 para 1.29 ETH"), linha de contexto opcional e descrição do efeito; fica desabilitada com o motivo quando não se aplica (carrinho vazio, nenhum evento ainda). O botão mostra o status do tempo real; a seção mostra a contagem regressiva da queda.
- **A11y:** painel não modal (`region` rotulada) que recebe foco ao abrir; Esc fecha e devolve o foco ao botão. Ação em andamento ignora cliques em vez de desabilitar o botão, para o foco não se perder. O axe roda no painel aberto (`15-mock-panel.spec.ts`).
