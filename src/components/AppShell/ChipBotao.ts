import { chakra } from "@chakra-ui/react";

/** Botão com props de estilo do Chakra, **já sem a aparência nativa**.
 *
 * Dois motivos pra existir, e os dois já morderam:
 *
 * 1. `chakra("button")` em vez de `HStack as="button"`: o segundo não aceita
 *    `type`, e botão sem `type="button"` dentro de formulário vira submit por
 *    padrão do HTML.
 *
 * 2. ⚠️ **O reset abaixo não é decoração.** O sistema roda com
 *    `preflight: false` até o `index.css` ser apagado (ver `theme/index.ts`),
 *    então o Chakra **não zera** a aparência nativa dos elementos. Um
 *    `<button>` sem isto renderiza com o fundo cinza, a borda e a fonte do
 *    navegador por baixo das props de layout -- foi exatamente o que
 *    aconteceu com o chip do usuário na topbar.
 *
 *    Vale pra **todo** elemento nativo que o navegador estiliza sozinho
 *    (`button`, `input`, `select`, `textarea`) enquanto o preflight estiver
 *    desligado. Um reset global em `globalCss` não resolveria de forma
 *    confiável: o `index.css` é unlayered e o Chakra emite em camadas, então
 *    o CSS antigo ganharia do reset.
 */
export const ChipBotao = chakra("button", {
  base: {
    appearance: "none",
    background: "transparent",
    border: "0",
    padding: "0",
    margin: "0",
    font: "inherit",
    color: "inherit",
    textAlign: "left",
    cursor: "pointer",
  },
});
