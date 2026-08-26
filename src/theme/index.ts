import { createSystem, defaultConfig } from "@chakra-ui/react";

import { cores, fontes, raios, sombras, tipografia } from "./tokens";

/** Sistema de design do Chakra, alimentado por `tokens.ts`. É a ÚNICA fonte
 * de estilo da aplicação desde que o `src/index.css` (1050 linhas) foi
 * apagado, no fim da Fase 2.
 *
 * ⚠️ `preflight: false` continua, e agora por escolha, não por transição. O
 * `globalCss` abaixo já traz o que precisávamos do reset -- e cada linha
 * dele entrou depois de um bug concreto, com o motivo anotado. Ligar o
 * preflight do Chakra agora traria um lote de regras que ninguém pediu
 * (imagens em bloco, tamanho de heading, borda de tabela) contra uma base
 * que todas as telas já foram verificadas em Chrome.
 */
export const system = createSystem(defaultConfig, {
  preflight: false,
  theme: {
    /** A entrada do aviso (`@keyframes toastin` do artifact). Fica no tema
     * e não no componente porque `@keyframes` é global por definição: o
     * nome precisa existir no documento pra a animação encontrá-lo. */
    keyframes: {
      "aviso-entrar": {
        from: { opacity: 0, transform: "translateY(6px)" },
        to: { opacity: 1, transform: "none" },
      },
    },

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
        /* ⚠️ Os TRÊS precisam de `dark` aqui, não só o `bad`.
           Este bloco é a camada de tokens CRUS; o `status.*.text` lá embaixo
           só aponta pra ela. Quando `good` e `warn` ficaram sem `dark`, a
           referência `{colors.warn.dark}` não resolveu e a cor caiu pro
           herdado -- a etiqueta "Em andamento" saiu com o texto em `ink`
           sobre o âmbar. Passava em contraste (14,81:1) e parecia
           plausível na tela: o defeito só apareceu ao MEDIR a cor computada
           no Chrome. */
        good: {
          DEFAULT: { value: cores.good },
          tint: { value: cores.goodTint },
          dark: { value: cores.goodDark },
        },
        warn: {
          DEFAULT: { value: cores.warn },
          tint: { value: cores.warnTint },
          dark: { value: cores.warnDark },
        },
        bad: {
          DEFAULT: { value: cores.bad },
          tint: { value: cores.badTint },
          dark: { value: cores.badDark },
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
          /* ⚠️ A variável, não a propriedade. A receita do Chakra emite
             `border-color: var(--focus-ring-color)` e `outline-color:
             var(--focus-ring-color)` DEPOIS das nossas declarações, na
             mesma classe compilada -- disputar `borderColor` aqui perde
             sempre, e o campo focado ficava cinza (`#a1a1aa`, o
             `gray-400` que a variável trazia por padrão) com o nosso halo
             azul em volta. Trocando a variável, a borda e o contorno da
             própria receita passam a ser da marca. */
          _focusVisible: {
            /* ⚠️ A variável vai AQUI DENTRO, não no `base`. A receita do
               Chakra emite `border-color: var(--focus-ring-color)` e
               `outline-color: var(--focus-ring-color)` depois das nossas
               declarações, então disputar `borderColor` perde sempre; e
               declarar a variável no `base` também perde, porque a receita
               redefine ela lá com o mesmo peso. Neste bloco o seletor é
               `:is(:focus-visible, [data-focus-visible])`, que vence a
               classe seca -- e aí borda e contorno da própria receita
               passam a ser da marca em vez do `#a1a1aa` que vinha por
               padrão. Medido no navegador; sem isso o campo focado fica
               cinza com o halo azul em volta. */
            "--focus-ring-color": "{colors.fg.brand}",
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
          /* ⚠️ A variável, não a propriedade. A receita do Chakra emite
             `border-color: var(--focus-ring-color)` e `outline-color:
             var(--focus-ring-color)` DEPOIS das nossas declarações, na
             mesma classe compilada -- disputar `borderColor` aqui perde
             sempre, e o campo focado ficava cinza (`#a1a1aa`, o
             `gray-400` que a variável trazia por padrão) com o nosso halo
             azul em volta. Trocando a variável, a borda e o contorno da
             própria receita passam a ser da marca. */
          _focusVisible: {
            /* ⚠️ A variável vai AQUI DENTRO, não no `base`. A receita do
               Chakra emite `border-color: var(--focus-ring-color)` e
               `outline-color: var(--focus-ring-color)` depois das nossas
               declarações, então disputar `borderColor` perde sempre; e
               declarar a variável no `base` também perde, porque a receita
               redefine ela lá com o mesmo peso. Neste bloco o seletor é
               `:is(:focus-visible, [data-focus-visible])`, que vence a
               classe seca -- e aí borda e contorno da própria receita
               passam a ser da marca em vez do `#a1a1aa` que vinha por
               padrão. Medido no navegador; sem isso o campo focado fica
               cinza com o halo azul em volta. */
            "--focus-ring-color": "{colors.fg.brand}",
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
        /* 🔴 Cada tom do semáforo tem TRÊS papéis, e a distinção é de
           acessibilidade, não de gosto:

             DEFAULT  a cor cheia -- só pra ELEMENTO GRÁFICO (tarja, ponto,
                      ícone), que passa em 3:1
             bg       o tint, pra fundo de selo e faixa
             text     a versão escurecida, pra TEXTO -- é a única que passa
                      em 4,5:1, a régua de texto pequeno

           `bad` teve os três primeiro, sozinho. `good` e `warn` ficaram só
           com dois por um tempo, e o efeito foi `Faixa` pintando texto de
           13,5px/700 em 3,00:1 e 3,12:1 nos dois tons. Ver `tokens.ts`. */
        status: {
          good: {
            DEFAULT: { value: "{colors.good}" },
            bg: { value: "{colors.good.tint}" },
            text: { value: "{colors.good.dark}" },
          },
          warn: {
            DEFAULT: { value: "{colors.warn}" },
            bg: { value: "{colors.warn.tint}" },
            text: { value: "{colors.warn.dark}" },
          },
          bad: {
            DEFAULT: { value: "{colors.bad}" },
            bg: { value: "{colors.bad.tint}" },
            text: { value: "{colors.bad.dark}" },
          },
        },
      },
    },
  },

  globalCss: {
    "html, body": { margin: 0, padding: 0 },

    body: {
      fontFamily: "ui",
      fontSize: tipografia.tamanhoBase,
      lineHeight: tipografia.alturaLinha,
      /** Fundo e cor do texto também vinham do `index.css`. Ficam aqui, e
       * não numa folha à parte, pra que exista UMA fonte de verdade: foi
       * uma segunda definição de `color` no `body` que fez toda a
       * aplicação herdar o azul-escuro da paleta antiga por semanas. */
      bg: "bg.canvas",
      color: "fg",
      /* ⚠️ Sem isto o texto sai mais grosso que o do artifact no macOS --
         diferença pequena e visível lado a lado. A tipagem do Chakra não
         conhece a propriedade (prefixada e fora do padrão), daí o cast. */
      ...({ WebkitFontSmoothing: "antialiased" } as Record<string, string>),
    },

    /** Foco visível em tudo que recebe foco por teclado. Sem isto, quem
     * navega por Tab não enxerga onde está -- e a maior parte dos nossos
     * componentes não declara anel próprio. */
    ":focus-visible": {
      outline: "2px solid",
      outlineColor: "brand",
      outlineOffset: "2px",
    },

    /** `border-box` em tudo: vinha do `index.css`, e sem ele largura e
     * padding voltam a se somar -- todo campo de 100% estoura o container
     * que o segura.
     *
     * Junto, quem pede menos movimento no sistema recebe menos movimento aqui.
     * Cobre também as animações que vêm de dentro do Chakra.
     *
     * O seletor leva a media query junto, e não o contrário: a tipagem do
     * `globalCss` aceita condição DENTRO de um seletor, não um seletor
     * dentro de uma condição. */
    "*": {
      boxSizing: "border-box",
      "@media (prefers-reduced-motion: reduce)": {
        animationDuration: "0.01ms !important",
        transitionDuration: "0.01ms !important",
      },
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
     * Isto NÃO é o preflight inteiro: é só a margem e a aparência que o
     * navegador injeta sozinho, sem tocar em cores, bordas de campo nem
     * tamanho de heading.
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
     * classe continua vencendo. */
    "*, *::before, *::after": { borderWidth: 0, borderStyle: "solid" },

    // Sem `padding` de propósito: componente que quer zero padding define
    // explicitamente, e assim nada é achatado por engano.
    button: { background: "none", cursor: "pointer" },
    fieldset: { margin: 0, padding: 0, border: 0 },
    /** Terceiro caso da mesma família do `<p>` e do `<button>`: sem
     * preflight, o navegador sublinha todo `<a>`. Os itens do menu lateral
     * são `<Link>` do router, e apareciam sublinhados -- no artifact eles
     * são `<button>`, sem sublinhado nenhum.
     *
     * Quem quer sublinhado pede: é o que o `BotaoDeLink` faz no hover. */
    a: { color: "inherit", textDecoration: "none" },
  },
});
