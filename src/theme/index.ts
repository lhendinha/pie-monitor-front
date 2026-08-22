import { createSystem, defaultConfig } from "@chakra-ui/react";

import { cores, fontes, raios, sombras, tipografia } from "./tokens";

/** Sistema de design do Chakra, alimentado por `tokens.ts`.
 *
 * ⚠️ `preflight: false`, e isso é o ponto mais importante deste arquivo
 * durante a Fase 2. O reset global do Chakra briga com o `src/index.css`
 * (1097 linhas), que ainda é o design system de todas as telas não migradas.
 * Ligar o reset agora desconfigura todas elas de uma vez -- e a partir daí
 * não dá pra saber se um bug é da tela nova ou do reset.
 *
 * Ele é ligado na ÚLTIMA etapa da fase, quando o `index.css` já tiver sido
 * apagado. Enquanto houver `className` apontando pra lá, fica desligado.
 */
export const system = createSystem(defaultConfig, {
  preflight: false,
  theme: {
    tokens: {
      colors: {
        brand: {
          DEFAULT: { value: cores.brand },
          dark: { value: cores.brandDark },
          darker: { value: cores.brandDarker },
          tint: { value: cores.brandTint },
          tint2: { value: cores.brandTint2 },
        },
        ink: { value: cores.ink },
        slate: {
          DEFAULT: { value: cores.slate },
          muted: { value: cores.slate2 },
        },
        line: {
          DEFAULT: { value: cores.line },
          soft: { value: cores.line2 },
        },
        canvas: { value: cores.canvas },
        surface: { value: cores.surface },
        good: {
          DEFAULT: { value: cores.good },
          tint: { value: cores.goodTint },
        },
        warn: {
          DEFAULT: { value: cores.warn },
          tint: { value: cores.warnTint },
        },
        bad: {
          DEFAULT: { value: cores.bad },
          tint: { value: cores.badTint },
        },
      },
      fonts: {
        ui: { value: fontes.ui },
        mono: { value: fontes.mono },
      },
      radii: {
        sm: { value: raios.sm },
        md: { value: raios.md },
        lg: { value: raios.lg },
      },
      shadows: {
        sm: { value: sombras.sm },
        md: { value: sombras.md },
      },
    },

    /** O que os componentes consomem. A camada existe pra que uma tela peça
     * "a cor do texto secundário" e não "slate.muted" -- se o papel mudar de
     * cor, muda aqui e não em 40 arquivos. */
    semanticTokens: {
      colors: {
        "fg.default": { value: "{colors.ink}" },
        "fg.muted": { value: "{colors.slate}" },
        "fg.subtle": { value: "{colors.slate.muted}" },
        "fg.brand": { value: "{colors.brand}" },
        "bg.canvas": { value: "{colors.canvas}" },
        "bg.surface": { value: "{colors.surface}" },
        "bg.brand.subtle": { value: "{colors.brand.tint}" },
        "border.default": { value: "{colors.line}" },
        "border.subtle": { value: "{colors.line.soft}" },
        "status.good": { value: "{colors.good}" },
        "status.good.bg": { value: "{colors.good.tint}" },
        "status.warn": { value: "{colors.warn}" },
        "status.warn.bg": { value: "{colors.warn.tint}" },
        "status.bad": { value: "{colors.bad}" },
        "status.bad.bg": { value: "{colors.bad.tint}" },
      },
    },
  },

  globalCss: {
    body: {
      fontFamily: "ui",
      fontSize: tipografia.tamanhoBase,
      lineHeight: tipografia.alturaLinha,
    },
    ".num": { fontVariantNumeric: "tabular-nums" },

    /** ⚠️ Reset mínimo por TAG -- a parte do preflight que não dá pra adiar.
     *
     * Com `preflight: false`, todo elemento nativo mantém o estilo padrão do
     * navegador **por baixo** das props do Chakra. Isso já mordeu duas vezes
     * em dois componentes:
     *
     * - `<button>` renderizando com o cinza e a borda do navegador;
     * - `<p>` (que é o que o `Text` do Chakra emite) carregando
     *   `margin: 1em 0`, o que inflava cada item do menu lateral de 38px pra
     *   65px. O espaçamento parecia escolha de design; era margem default.
     *
     * Conferido antes de adicionar: o `index.css` **não estiliza nenhuma
     * destas tags diretamente** -- ele trabalha só por classe. Então não há
     * conflito, mesmo com ele sendo unlayered (o que o faria vencer o
     * Chakra, que emite em camadas).
     *
     * Isto NÃO é o preflight: continua sem tocar em cores, bordas de input,
     * `box-sizing` global nem nada que desconfigure tela ainda não migrada.
     * É só a margem/aparência que o navegador injeta sozinho.
     */
    "p, h1, h2, h3, h4, h5, h6, figure, blockquote, dl, dd": { margin: 0 },
    "ul, ol": { margin: 0, padding: 0 },
    "button, input, select, textarea": { font: "inherit", color: "inherit" },
    // Sem `padding` de propósito: `.icon-btn` do index.css não define o
    // próprio e seria achatado. Componente Chakra que quer zero padding
    // define explicitamente.
    button: { background: "none", border: 0, cursor: "pointer" },
    fieldset: { margin: 0, padding: 0, border: 0 },
  },
});
