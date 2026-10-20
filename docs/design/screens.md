# Telas

Última revisão: 2026-10-20

Mapa frame → rota → componentes. Os renders do Figma (1x, WebP) ficam em
[`frames/`](frames/) para comparação lado a lado. A regressão visual
(`tests/e2e/13-visual.spec.ts`) congela início, detalhe, carrinho e pagamento
em 1440 e 390 px.

## Frames

| Frame do Figma | Rota | Página | Render |
| --- | --- | --- | --- |
| Desktop / Início · Mobile / Início | `/` | `features/catalog/HomePage.tsx` | [desktop](frames/desktop-inicio.webp) · [mobile](frames/mobile-inicio.webp) |
| Desktop / Detalhes do NFT · Mobile / Detalhes do NFT | `/nft/$nftId` (`?edition=`) | `features/nft/NftDetailPage.tsx` | [desktop](frames/desktop-detalhes-do-nft.webp) · [mobile](frames/mobile-detalhes-do-nft.webp) |
| Desktop / Carrinho de NFTs · Mobile / Carrinho de NFTs | `/cart` | `features/cart/CartPage.tsx` | [desktop](frames/desktop-carrinho-de-nfts.webp) · [mobile](frames/mobile-carrinho-de-nfts.webp) |
| Desktop / Pagamento · Mobile / Pagamento | `/checkout` (privada) | `features/checkout/CheckoutPage.tsx` | [desktop](frames/desktop-pagamento.webp) · [mobile](frames/mobile-pagamento.webp) |
| Desktop / Confirmação de Pedido | `/orders/$orderId` (privada) | `features/orders/OrderPage.tsx` | [desktop](frames/desktop-confirmacao-de-pedido.webp) |
| Desktop / Login · Mobile / Login | `/login` (`?redirect=&reason=`) | `features/auth/AuthScreen.tsx` | [desktop](frames/desktop-login.webp) · [mobile](frames/mobile-login.webp) |
| Desktop / Cadastro · Mobile / Cadastro | `/signup` | `features/auth/AuthScreen.tsx` | [desktop](frames/desktop-cadastro.webp) · [mobile](frames/mobile-cadastro.webp) |
| Desktop / Perfil do Colecionador | `/profile` (privada) | `features/account/ProfilePage.tsx` | [desktop](frames/desktop-perfil-do-colecionador.webp) |
| Desktop / Carteiras | `/wallets` (privada) | `features/account/WalletsPage.tsx` | [desktop](frames/desktop-carteiras.webp) |
| — | `/favorites` (privada) | `features/favorites/FavoritesPage.tsx` | Lista de interesse, no padrão do grid |
| — | `/design-system` | página viva de tokens e componentes | — |
| — | qualquer outra | 404 do `__root` | — |

Perfil, carteiras e confirmação não têm frame mobile. Eles reorganizam o
layout do desktop: a sidebar do perfil vira lista horizontal e a confirmação
vira página em vez de modal.

## Estados não desenhados

Todos seguem os tokens e a composição das telas vizinhas.

| Estado | Onde | Como |
| --- | --- | --- |
| Carregando | catálogo, detalhe, carrinho, resumo, pagamento, perfil, carteiras | skeleton com shimmer nas dimensões do conteúdo (CLS 0) |
| Atualizando em segundo plano | catálogo | página anterior esmaecida e `aria-busy` |
| Vazio | catálogo, carrinho, lista de interesse | mensagem + ação ("Limpar filtros", "Explorar o mercado") |
| Erro | listas, detalhe, cotação, pedido | `ErrorState` com mensagem da API e "Tentar novamente" |
| 404 | rota, NFT, pedido de outra conta | `NotFoundPage` |
| Preço mudou ou edição esgotou | carrinho, pagamento, revisão | aviso âmbar com "Aceitar novos preços"; badge na linha |
| Revisão antes do envio | pagamento | diálogo no padrão do modal de confirmação |
| Conexão da carteira | pagamento | desconectada, aguardando aprovação, conectada e recusada |
| Pedido pendente ou recusado | `/orders/$id` | spinner com texto; recusa com motivo e volta ao carrinho |
| Sessão expirada | login | aviso âmbar acima do formulário + toast |
| Tempo real offline | todas | faixa "Conexão em tempo real perdida. Reconectando…" |
| Tablet (768–1023 px) | todas | header desktop; filtros no Sheet; grid em 3 colunas |

## Desvios do Figma

Cada desvio tem motivo. A regra é não "melhorar" o design: só onde o
enunciado, a acessibilidade ou a coerência do fluxo pedem.

| # | Onde | Figma | Implementação | Motivo |
| --- | --- | --- | --- | --- |
| 1 | Início, desktop | só o ícone de busca no header | campo "Explorar coleções" acima das abas; o ícone do header leva até ele | a busca é obrigatória e precisa de um campo rotulado |
| 2 | Início, sidebar | "Arte digital" destacado (filtro aplicado: 33 itens, 4 páginas) | sem filtro por padrão (239 itens); `/?collections=["arte-digital"]` reproduz o frame | o frame mostra um estado filtrado, não o inicial |
| 3 | Início, "Rede" | 119 / 78 / 86 (soma 283) | 105 / 64 / 70 (soma 239) | as contagens de coleção do Figma somam 239; as de rede não fecham com elas, então a proporção foi mantida |
| 4 | Card e detalhe | preço anterior em cor neutra | preço anterior riscado + "Preço anterior" para leitor de tela | o significado não pode depender só da cor |
| 5 | Formulários | texto de erro em Color/Error (#ED1B2E) | `danger-text` (#FF7A84); Color/Error fica na borda | #ED1B2E sobre o fundo dá 4,4:1, abaixo de 4,5:1 |
| 6 | Login e cadastro | só placeholder | label visualmente oculto + placeholder | todo campo precisa de nome acessível |
| 7 | Pagamento | endereço, ENS e tipo de carteira editáveis | preenchidos da carteira cadastrada, somente leitura; "Carteira e rede" escolhe a extensão; bloco "Conectar carteira" | o enunciado pede usar as carteiras cadastradas e simular conexão, recusa e desconexão |
| 8 | Pagamento | "Usar outra carteira?" como radio | checkbox (alterna principal e secundária) | é um liga/desliga |
| 9 | Pagamento | envio direto | diálogo de revisão antes de enviar | o enunciado pede revisão e revalidação antes do envio |
| 10 | Pagamento, mobile | sem formulário de comprador | formulário recolhido em "Revisar dados", abrindo sozinho se algo for inválido | os dados do comprador são obrigatórios na API |
| 11 | Detalhe | galeria com a mesma imagem 4× | mantido | o arquivo só tem 4 artes |
| 12 | TabBar mobile | botão central sem rótulo | "Buscar NFTs" | botão sem função definida no Figma |
| 13 | Header | "Início" ativo também no perfil e nas carteiras; header rola com a página | ativo conforme a seção na tela (Início ou Mercado na home; Mercado nas telas de compra; nenhum no perfil); header fixo no topo | a navegação precisa continuar alcançável e mostrar onde a pessoa está |
| 14 | Links do rodapé, Criadores, Aprenda, blog | links na mesma cor dos ativos | visíveis, esmaecidos e marcados como indisponíveis; no header, o clique avisa "ainda não faz parte desta demonstração" | o enunciado exclui páginas editoriais; ações fora do escopo não podem parecer funcionar nem parecer quebradas |
| 15 | Newsletter, login social, "Esqueceu a senha?" | ações | toast explicando que não fazem parte da demonstração | mesmo motivo |
| 16 | Confirmação | "Ver no Etherscan" | diálogo com o hash e o aviso de transação simulada | um link real daria 404 no explorador |
| 17 | Paginação | 1 2 3 4 > | janela de 4 páginas ao redor da atual, ‹ › | o catálogo inteiro tem 27 páginas |
