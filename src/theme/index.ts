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
      /** ⚠️ `heading` e `body` são os nomes que o Chakra já usa nas próprias
       * receitas -- sem sobrescrevê-los, todo `Heading` saía em Inter (o
       * default dele) enquanto o resto da tela ia de Manrope. Criar só um
       * `fonts.ui` novo não alcança as receitas da lib. */
      fonts: {
        heading: { value: fontes.ui },
        body: { value: fontes.ui },
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

    /** Campos de texto do sistema (`.field input` / `.field textarea` do
     * artifact): 9px 12px, raio 6, borda `line`, e no foco a borda da marca
     * com um anel de 3px.
     *
     * Vai na receita e não em cada formulário: são dezenas de campos entre
     * Processos, Clientes, Grupo e Login, e a única forma de eles não
     * divergirem é existirem num lugar só. */
    recipes: {
      input: {
        /* ⚠️ `px`/`py` na variante de tamanho, não `padding` no `base`: a
           receita do Chakra define `px`/`py` em `size.md`, e tanto a
           variante vence o base quanto a propriedade específica vence a
           abreviada -- ficava 8px vertical no lugar dos 9px do artifact. */
        variants: { size: { md: { px: "12px", py: "9px", height: "auto" } } },
        base: {
          width: "100%",
          padding: "9px 12px",
          borderWidth: "1px",
          borderColor: "border",
          borderRadius: "sm",
          bg: "bg.surface",
          fontSize: "14px",
          /* Mesmo cinza que o artifact usa no placeholder dos selects
             (`.csel-trigger.placeholder`). Lá os campos de texto ficaram com
             o cinza padrão do navegador (#757575) por omissão -- aqui vale a
             coerência com o resto do sistema. */
          _placeholder: { color: "fg.subtle" },
          _focusVisible: {
            outline: "none",
            borderColor: "fg.brand",
            boxShadow: "0 0 0 3px {colors.brand.tint}",
          },
        },
      },
      textarea: {
        /* ⚠️ `px`/`py` na variante de tamanho, não `padding` no `base`: a
           receita do Chakra define `px`/`py` em `size.md`, e tanto a
           variante vence o base quanto a propriedade específica vence a
           abreviada -- ficava 8px vertical no lugar dos 9px do artifact. */
        variants: { size: { md: { px: "12px", py: "9px", height: "auto" } } },
        base: {
          width: "100%",
          padding: "9px 12px",
          borderWidth: "1px",
          borderColor: "border",
          borderRadius: "sm",
          bg: "bg.surface",
          fontSize: "14px",
          minHeight: "76px",
          resize: "vertical",
          _placeholder: { color: "fg.subtle" },
          _focusVisible: {
            outline: "none",
            borderColor: "fg.brand",
            boxShadow: "0 0 0 3px {colors.brand.tint}",
          },
        },
      },
    },

    /** O que os componentes consomem. A camada existe pra que uma tela peça
     * "a cor do texto secundário" e não "slate.muted" -- se o papel mudar de
     * cor, muda aqui e não em 40 arquivos.
     *
     * ⚠️ ANINHADO, nunca com chave achatada (`"fg.subtle"`). A chave com
     * ponto vira um token chamado literalmente `fg.subtle`, emitido como
     * `--chakra-colors-fg\.subtle` -- variável DIFERENTE da
     * `--chakra-colors-fg-subtle` que a prop `color="fg.subtle"` lê. O
     * resultado é silencioso e feio: o Chakra já define `fg.muted`,
     * `fg.subtle` e `border.subtle` por padrão, então a tela inteira
     * passava a usar o cinza zinco dele (`#a1a1aa`) no lugar do slate do
     * artifact (`#8493a1`). Aninhado, os nomes coincidem e o meu vence. */
    semanticTokens: {
      /** ⚠️ Mesma armadilha das cores: o Chakra tem `shadows.sm`/`md`
       * SEMÂNTICOS, e o semântico vence o token cru declarado acima. Sem
       * estas duas linhas, `boxShadow="sm"` desenhava a sombra dupla e
       * escura da lib no lugar do `0 1px 2px rgba(15,32,45,.07)` do
       * artifact -- todo cartão da aplicação saía mais pesado. */
      shadows: {
        sm: { value: sombras.sm },
        md: { value: sombras.md },
      },
      colors: {
        fg: {
          DEFAULT: { value: "{colors.ink}" },
          muted: { value: "{colors.slate}" },
          subtle: { value: "{colors.slate.muted}" },
          brand: { value: "{colors.brand}" },
        },
        bg: {
          canvas: { value: "{colors.canvas}" },
          surface: { value: "{colors.surface}" },
          brand: { subtle: { value: "{colors.brand.tint}" } },
          /** ⚠️ Estes quatro são do Chakra, não nossos -- e por padrão são
           * zinco. Componentes DELE os usam por dentro: o `Skeleton`, por
           * exemplo, pinta a barra com `bg.emphasized` e saía cinza-zinco
           * (#e4e4e7) no meio de uma tela slate. Alinhar aqui conserta de
           * uma vez qualquer componente da lib que venhamos a usar. */
          DEFAULT: { value: "{colors.surface}" },
          panel: { value: "{colors.surface}" },
          subtle: { value: "{colors.canvas}" },
          muted: { value: "{colors.line.soft}" },
          emphasized: { value: "{colors.line}" },
        },
        border: {
          DEFAULT: { value: "{colors.line}" },
          subtle: { value: "{colors.line.soft}" },
        },
        status: {
          good: { DEFAULT: { value: "{colors.good}" }, bg: { value: "{colors.good.tint}" } },
          warn: { DEFAULT: { value: "{colors.warn}" }, bg: { value: "{colors.warn.tint}" } },
          bad: { DEFAULT: { value: "{colors.bad}" }, bg: { value: "{colors.bad.tint}" } },
        },
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

    /** ⚠️ A regra que mais faltava do preflight, e que mordeu quatro vezes
     * em componentes diferentes.
     *
     * `border-style` nasce `none` (e `inset` nos campos), e largura sem
     * estilo **computa zero**. Ou seja: `borderWidth="1px"` vindo de prop
     * do Chakra simplesmente não desenha nada, sem erro nenhum. Foi assim
     * que sumiram a borda da pílula de datas, a do campo de data, a da
     * busca (que saía chanfrada) e a divisória direita do menu lateral.
     *
     * Largura zero + estilo sólido: nada ganha borda sozinho, e qualquer
     * `borderWidth` posterior funciona. É exatamente o que o preflight do
     * Tailwind faz, e o Chakra faria se o dele estivesse ligado.
     *
     * Seletor universal tem especificidade 0, então qualquer regra por
     * classe do `index.css` continua vencendo. */
    "*, *::before, *::after": { borderWidth: 0, borderStyle: "solid" },

    // Sem `padding` de propósito: `.icon-btn` do index.css não define o
    // próprio e seria achatado. Componente Chakra que quer zero padding
    // define explicitamente.
    button: { background: "none", cursor: "pointer" },
    fieldset: { margin: 0, padding: 0, border: 0 },
    /** Terceiro caso da mesma família do `<p>` e do `<button>`: sem
     * preflight, o navegador sublinha todo `<a>`. Os itens do menu lateral
     * são `<Link>` do router, e apareciam sublinhados -- no artifact eles
     * são `<button>`, sem sublinhado nenhum.
     *
     * Conferido: as duas regras de `text-decoration: underline` do
     * `index.css` são de `button` (`.link-button`, `.footer-note button`),
     * então nada aqui as atropela. */
    a: { color: "inherit", textDecoration: "none" },
  },
});
