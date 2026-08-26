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

  /* 🔴 As três cores do semáforo REPROVAM em AA pra texto pequeno -- em
     TODOS os fundos do sistema, não só no tint. Medido:

                    tint    branco   canvas
       good        3,12    3,49     3,25
       warn        3,00    3,35     3,12
       bad         3,72    4,04     3,77

     Todas passam em 3:1, que é a régua de ELEMENTO GRÁFICO -- por isso a
     tarja de prioridade, o ponto do cartão e os ícones seguem usando a cor
     cheia, e fazem certo. O que não pode é texto.

     `badDark` nasceu primeiro, sozinho, quando a etiqueta de falha precisou.
     Os gêmeos vieram depois, ao descobrir que o problema nunca foi só do
     vermelho: `Faixa` pintava os DOIS tons em 13,5px/700, e ninguém tinha
     medido o verde.

     Os três guardam o MATIZ e a saturação da cor cheia, só baixando a
     luminosidade -- é o que faz "o âmbar escuro" continuar sendo âmbar. */
  /** Vermelho escurecido, pra TEXTO. 4,78:1 sobre `badTint`. Já era usado no
   * hover do botão de perigo. */
  badDark: "#b93a44",
  /** Âmbar escurecido, pra TEXTO. 4,80:1 sobre `warnTint`, 5,36:1 no branco. */
  warnDark: "#995d00",
  /** Verde escurecido, pra TEXTO. 4,82:1 sobre `goodTint`, 5,39:1 no branco. */
  goodDark: "#167953",
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
