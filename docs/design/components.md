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
- **Uso:** casca de todas as rotas: link "Pular para o conteúdo", Header, aviso de tempo real, `<main id="conteudo">`, Footer, TabBar mobile, Toaster, LiveRegion e o painel de mocks (lazy).
- **A11y:** o skip link é o primeiro foco; o `main` recebe foco programático.

### SiteHeader
- **Arquivo:** `src/components/layout/SiteHeader.tsx` · **Figma:** `Header With Divider`, `Header Row` (Active=Home / Active=Market)
- **Uso:** desktop e tablet (`md+`). Logo, navegação (Início, Mercado, Criadores, Aprenda), busca, carrinho com contador e Entrar/usuário.
- **Estados:** item ativo em `accent` com sublinhado `primary`, com `aria-current="page"`; Criadores e Aprenda aparecem desabilitados (fora do escopo).
- **Guidelines:** o contador do carrinho é a soma das quantidades, e o link anuncia "Carrinho, N itens".

### MobileTabBar
- **Arquivo:** `src/components/layout/MobileTabBar.tsx` · **Figma:** `Tab Bar` (Mobile / Início)
- **Uso:** navegação inferior fixa no mobile: Início, Lista de interesse, busca (botão central), Carrinho e Perfil.
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

## NFT, favoritos e carrinho

### FavoriteButton
- **Arquivo:** `src/features/favorites/FavoriteButton.tsx` · **Figma:** "Favoritar", coração
- **Estados:** coração preenchido (forma) e `aria-pressed`. A troca é otimista, com rollback e toast se a API falhar.

### EditionPicker · PurchasePanel · Gallery
- **Arquivo:** `src/features/nft/NftDetailPage.tsx` · **Figma:** "Edição: 1/1 · 1/10 · 1/50 · ABERTA", galeria com zoom
- **A11y:** edições formam um radio group (setas navegam), e a esgotada vem riscada e com "esgotada" no nome.

### QuoteTotals · CouponForm · QuoteNotice
- **Arquivos:** `src/features/cart/components/*` · **Figma:** "Resumo da carteira"
- **Guidelines:** os valores vêm só da cotação da API. O cupom é um `group`, não um `form`, porque também vive dentro do formulário de pagamento. O aviso de mudança tem "Aceitar novos preços".

## Pagamento, pedido e conta

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
- **Uso:** demonstração: cenário, reset e gatilhos de evento. Só fala com a API de controle (`/api/__mock/*`). Nos testes visuais, fica oculto.
