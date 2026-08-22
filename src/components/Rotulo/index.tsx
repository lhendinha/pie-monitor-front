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
    fontSize: "11.5px",
    fontWeight: "700",
    color: "fg.subtle",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
});
