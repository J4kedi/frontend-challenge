# Tokens

Última revisão: 2026-10-20

Fonte: [`src/styles/theme.css`](../../src/styles/theme.css), bloco `@theme`.
Cada token nasce de um estilo do Figma (versão `2397163412428844678`). A coluna
"Figma" usa o nome do estilo exatamente como está no arquivo.

## Cores

| Token (`--color-*`) | Valor | Figma | Utility | Uso |
| --- | --- | --- | --- | --- |
| `ink` | `#140d0a` | Color/Ink | `bg-ink`, `text-ink` | fundo da página; texto sobre laranja |
| `surface` | `#241612` | Color/Surface Card | `bg-surface` | cards, sidebar, linhas do carrinho |
| `surface-raised` | `#2f1d15` | Color/Surface Raised | `bg-surface-raised` | popovers, toasts, botões redondos |
| `surface-dark` | `#38220f` | Color/Surface Dark | `bg-surface-dark` | faixa do rodapé, destaque |
| `surface-light` | `#fbfbfb` | Color/Background Elevated | — | reservado (não usado nas telas) |
| `primary` | `#d28a4c` | Color/Primary | `bg-primary`, `border-primary` | botões, estado ativo, sublinhado da navegação |
| `accent` | `#e89b55` | Text/Accent | `text-accent` | preços, links, item ativo |
| `secondary` | `#b39463` | Color/Secondary | `text-secondary` | ícones de ação (lixeira) |
| `coral` | `#f0805f` | Text/Coral | `text-coral` | asterisco obrigatório, esgotado |
| `amber` | `#e3a44e` | Color/Amber | `text-amber`, `border-amber` | avisos (preço mudou, limite) |
| `foreground` | `#f5f1eb` | Color/Foreground | `text-foreground` | texto principal |
| `muted-foreground` | `#cfb28c` | Text/Secondary | `text-muted-foreground` | texto de apoio, placeholders |
| `border` | `#3f2319` | Color/Border | `border-border` | divisórias, campos |
| `border-soft` | `#55321f` | Color/Border Soft | `border-border-soft` | contornos de cards e painéis |
| `success` | `#00a66c` | Color/Success | `text-success`, `border-success` | carteira conectada, cupom aplicado |
| `danger` | `#ed1b2e` | Color/Error | `border-danger` | borda de campo inválido |
| `danger-text` | `#ff7a84` | — (derivado) | `text-danger-text` | **texto** de erro: Color/Error não chega a 4,5:1 sobre ink |
| `white`, `black`, `gray-light` | — | Color/White, Color/Black, Color/Gray Light | — | neutros do arquivo |

Aliases do shadcn/ui, mapeados nos tokens acima: `background → ink`,
`card → surface`, `popover → surface-raised`, `primary-foreground → ink`,
`muted → surface-raised`, `destructive → danger`, `input → border-soft`,
`ring → accent`.

Contraste (WCAG 2.1, calculado com a fórmula de luminância relativa):

| Par | Razão |
| --- | --- |
| `foreground` sobre `ink` | 17,1:1 |
| `muted-foreground` sobre `ink` / `surface` | 9,5:1 / 8,7:1 |
| `ink` sobre `primary` (botões) | 6,9:1 |
| `accent` sobre `ink` / `surface` | 8,5:1 / 7,7:1 |
| `amber` sobre `ink` | 8,9:1 |
| `danger-text` sobre `ink` | 7,7:1 |
| `danger` (Color/Error) sobre `ink` | 4,4:1: abaixo de 4,5:1 para texto pequeno, por isso só borda |

## Tipografia

Família única: **Roboto Mono** (`--font-sans` e `--font-mono`), 400, 500 e 700.

| Token (`text-*`) | Tamanho / altura | Estilos do Figma de origem |
| --- | --- | --- |
| `micro` | 9 / 12 | Tiny/9 Bold |
| `tiny` | 10 / 13 | Tiny/10 Medium |
| `caption` | 12 / 16 | Caption/12 Regular, Bold |
| `caption-lg` | 13 / 22 | Caption/13 Regular |
| `body-sm` | 14 / 20 | Body/14 Regular, Medium, Bold |
| `body` | 15 / 20 | Body/15 Regular, Bold |
| `body-lg` | 16 / 21 | Body Large/16 Regular, Medium, Bold |
| `title-sm` | 18 / 24 | Body Large/18 Bold |
| `title` | 20 / 28 | Title/20 |
| `title-lg` | 22 / 29 | Title/22 |
| `heading` | 24 / 32 | Heading/24 Bold |
| `heading-lg` | 28 / 37 | Heading/28 Bold |
| `display` | 32 / 42 | Display/32 Bold |
| `display-lg` | 43 / 70 | Display/43 Bold (hero) |

O Figma tem ~60 estilos de texto, muitos só variando a altura de linha (por
exemplo, Body/14 com lh 15, 16, 20, 22, 24 e 30). A escala acima agrupa por
tamanho. Quando a tela pede outra altura de linha, ela vai como `leading-*`
no próprio elemento. `--tracking-wide` (0,1em) corresponde aos estilos com
letter-spacing de 1,4 px em 14 px.

## Raio, sombra e medidas

| Token | Valor | Figma |
| --- | --- | --- |
| `--radius-xs` · `sm` · `md` · `lg` · `xl` | 3 · 4 · 6 · 8 · 16 px | raios mais frequentes do arquivo (3, 4, 6, 8, 16) |
| `--shadow-card` | `0 4px 12px rgb(20 13 10 / .15)` | Drop shadow r12 y4 #140D0A 15% |
| `--shadow-raised` | `0 6px 20px rgb(10 6 4 / .45)` | Drop shadow r20 y6 #0A0604 45% |
| `--shadow-overlay` | `0 0 20px rgb(10 6 4 / .45)` | Drop shadow r20 #0A0604 45% (modais) |
| `--drop-shadow-tab-bar` | `0 -10px 30px rgb(10 6 4 / .45)` | Drop shadow r30 y-10 #0A0604 45% (Tab Bar; `filter`, segue o recorte) |
| `--container-page` | 1200 px | largura do conteúdo dos frames de 1440 |
| `--spacing-header` | 69 px | altura do Header With Divider |

## Movimento

- `skeleton`: utility de shimmer com gradiente `surface → surface-raised`, `--animate-shimmer` de 1,6 s.
- `prefers-reduced-motion: reduce` desliga animações e transições no `@layer base`. O skeleton vira bloco estático e o spinner do pedido para.
