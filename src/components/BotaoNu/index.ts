import { chakra } from "@chakra-ui/react";

/** `<button>` com props de estilo do Chakra e sem aparência própria.
 *
 * Existe porque `Box as="button"` **não aceita `type`** na tipagem do
 * Chakra, e botão sem `type="button"` dentro de formulário vira submit por
 * padrão do HTML -- bug silencioso e clássico.
 *
 * O reset de aparência (fundo, borda, cursor) já vem do reset por tag em
 * `theme/index.ts`; aqui sobra o que o navegador ainda injeta e que aquele
 * reset deixou de fora de propósito -- `padding`, que não pôde ser global
 * porque o `.icon-btn` do design antigo seria achatado.
 */
export const BotaoNu = chakra("button", {
  base: {
    padding: 0,
    margin: 0,
    textAlign: "left",
    cursor: "pointer",
  },
});
