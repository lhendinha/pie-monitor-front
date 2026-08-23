/** Valores crus do design system do Argos.
 *
 * Este é o ÚNICO arquivo do projeto onde `#rrggbb` pode aparecer. Componente
 * nenhum lê daqui direto: tudo passa pelos tokens semânticos do `system`
 * (ver `./index.ts`), pra que trocar uma cor seja uma linha e não uma busca
 * global.
 *
 * Os valores vieram do artifact de referência (as variáveis CSS do `:root`),
 * não de estimativa.
 */

/** Paleta bruta. Nome = papel na marca, não a cor em si -- `brandDark` segue
 * fazendo sentido se um dia o azul virar verde. */
export const cores = {
  brand: "#008fd5",
  brandDark: "#00679f",
  brandDarker: "#004f7a",
  brandTint: "#e8f5fc",
  brandTint2: "#d4edfa",

  // Texto e traço, do mais escuro ao mais claro.
  ink: "#152029",
  slate: "#5b6b7a",
  slate2: "#8493a1",
  line: "#e2e8ee",
  line2: "#edf1f4",

  // Fundos: `canvas` é a página, `surface` é o cartão em cima dela.
  canvas: "#f5f7f9",
  surface: "#ffffff",

  // Semáforo. Cada cor tem seu tom claro pro fundo do selo -- usar a cor
  // forte como fundo com texto branco não passa contraste em texto pequeno.
  good: "#1c9c6b",
  goodTint: "#e5f6ef",
  warn: "#c97a00",
  warnTint: "#fdf1de",
  bad: "#d64550",
  badTint: "#fbe9ea",
  /** O vermelho escurecido, pra TEXTO sobre o tint. O `bad` puro dá 3,72:1
   * sobre `badTint` -- reprova em AA pra texto pequeno; este dá 4,78:1. Já
   * era usado no hover do botão de perigo. */
  badDark: "#b93a44",
} as const;

export const raios = {
  sm: "6px",
  md: "10px",
  lg: "14px",
} as const;

export const sombras = {
  sm: "0 1px 2px rgba(15,32,45,.07)",
  md: "0 8px 24px rgba(15,32,45,.12)",
} as const;

/** Manrope pra interface, IBM Plex Mono pra número de processo e afins.
 * As pilhas de fallback são deliberadas: se o Google Fonts não carregar, a
 * tela continua legível na fonte do sistema em vez de cair em Times. */
export const fontes = {
  ui: "'Manrope', system-ui, -apple-system, 'Segoe UI', sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace",
} as const;

/** Base tipográfica do app -- 14px, não os 16px padrão do Chakra. É denso de
 * propósito: as telas são tabelas e listas de trabalho, não conteúdo de
 * leitura. */
export const tipografia = {
  tamanhoBase: "14px",
  alturaLinha: "1.45",
} as const;
