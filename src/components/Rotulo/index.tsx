import { chakra } from "@chakra-ui/react";

/** `<label>` com as props de estilo do Chakra.
 *
 * Nem `Text as="label"` nem `Field.Label` servem: o primeiro não aceita
 * `htmlFor` na tipagem, e o segundo exige estar dentro de um `Field.Root`
 * -- monta fora e estoura o contexto em tempo de execução.
 *
 * ⚠️ O caixa-alta dos rótulos vem de `textTransform`, **nunca** do texto.
 * Escrever "BUSCAR" no HTML muda o que o leitor de tela anuncia (alguns
 * soletram letra por letra) e quebra qualquer busca por texto no teste.
 */
export const Rotulo = chakra("label", {
  base: {
    display: "inline-block",
  },
  variants: {
    /** Três rótulos diferentes no artifact, e só um deles é caixa-alta:
     *
     * - `campo`: `.field label` -- 12.5px/700 em `ink`, texto normal. É o
     *   rótulo de formulário.
     * - `filtro`: `.filter-col-label` -- 11px/800, caixa-alta, cinza. É o
     *   rótulo de coluna dentro de painel de filtro.
     * - `secao`: o intermediário que já existia aqui, mantido para quem
     *   ainda o usa. */
    variante: {
      campo: { display: "block", fontSize: "12.5px", fontWeight: "700", color: "fg" },
      filtro: {
        display: "block",
        fontSize: "11px",
        fontWeight: "800",
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        color: "fg.subtle",
      },
      secao: {
        fontSize: "11.5px",
        fontWeight: "700",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: "fg.subtle",
      },
    },
  },
  defaultVariants: { variante: "secao" },
});
