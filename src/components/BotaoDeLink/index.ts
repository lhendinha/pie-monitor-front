import { chakra } from "@chakra-ui/react";

/** Botão que parece link (`.link-btn` do artifact): 12.5px/700 na cor da
 * marca, sem fundo nem borda, sublinhando no hover.
 *
 * É `<button>` e não `<a>` de propósito: onde ele é usado, o clique troca de
 * tela dentro do fluxo de entrada -- não é um endereço pra onde se possa
 * navegar direto nem abrir em outra aba.
 */
export const BotaoDeLink = chakra("button", {
  base: {
    background: "none",
    border: 0,
    padding: 0,
    color: "fg.brand",
    fontWeight: "700",
    fontSize: "12.5px",
    cursor: "pointer",
    _hover: { textDecoration: "underline" },
  },
});
