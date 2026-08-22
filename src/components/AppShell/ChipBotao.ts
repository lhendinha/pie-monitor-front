import { chakra } from "@chakra-ui/react";

/** Botão com props de estilo do Chakra.
 *
 * `chakra("button")` em vez de `HStack as="button"`: o segundo não aceita
 * `type`, e botão sem `type="button"` dentro de formulário vira submit por
 * padrão do HTML -- bug clássico e silencioso. */
export const ChipBotao = chakra("button");
