# Design System — Kurio

Última revisão: 2026-10-20

Casa da documentação de design: tokens, componentes, telas e os desvios em
relação ao Figma. Leia antes de mexer em UI.

## Origem

- **Figma:** [Frontend Challenge](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge), file key `Ff0SksUi7UFtPWUO8kyNtw`, **versão fixada `2397163412428844678`** (lastModified 2026-09-09).
- **Extração:** `pnpm figma:extract` (`scripts/figma-extract.mjs`, token `file_content:read` no `.env.local`). Ela grava:
  - os renders dos 15 frames em [`frames/`](frames/);
  - as 4 artes originais em `design/assets/nfts/`;
  - os ícones Iconly e a ilustração da confirmação em `src/assets/icons/`;
  - o manifesto com os hashes em `design/figma/manifest.json`.

  Com a versão fixada, rodar de novo reproduz os mesmos arquivos.
- **Imagens servidas:** `pnpm images` gera AVIF e WebP em 360, 720 e 1080 px a partir das originais (`public/images/nfts/`).

## Quando ler

- antes de criar ou alterar um componente em `src/components` ou `src/features/*/components`;
- antes de usar uma cor, fonte, raio ou sombra (só existem os tokens);
- antes de mudar a composição de uma tela que tem frame no Figma.

## Fonte de verdade ativa

| Assunto | Onde |
| --- | --- |
| Tokens (cor, tipo, raio, sombra, largura) | [`src/styles/theme.css`](../../src/styles/theme.css) → mapa em [`tokens.md`](tokens.md) |
| Componentes e uso | [`components.md`](components.md) |
| Telas, frames, estados não desenhados e desvios | [`screens.md`](screens.md) |
| Página viva com tokens e componentes reais | rota [`/design-system`](../../src/routes/design-system.tsx) (também no deploy) |
| Guard automático | [`src/styles/design-tokens.test.ts`](../../src/styles/design-tokens.test.ts): reprova hex/rgb cru e cor, fonte ou sombra arbitrária em `.tsx` |

## Regras em uma linha

- **Só tokens.** A paleta padrão do Tailwind foi zerada (`--color-*: initial`); uma cor que não está no Figma não existe como utility.
- **Roboto Mono em tudo**, em 400, 500 e 700, servida localmente (`@fontsource-variable/roboto-mono`).
- **Escala tipográfica nomeada** (`text-body-sm`, `text-title`, `text-display-lg`…), espelhando os estilos de texto do Figma; o `cn()` conhece essa escala (ver [`components.md`](components.md#cn)).
- **shadcn/ui adaptado**: os componentes em `src/components/ui` foram copiados e restilizados com os tokens; os aliases semânticos do shadcn (`primary`, `muted`, `ring`…) apontam para tokens do Figma.
- **Acessibilidade não muda o visual sem registro**: todo ajuste de contraste ou semântica está em [`screens.md`](screens.md#desvios-do-figma).

## Leia a seguir

- [`tokens.md`](tokens.md)
- [`components.md`](components.md)
- [`screens.md`](screens.md)
