import { Box, Flex, Text } from "@chakra-ui/react";

import { Rotulo } from "../Rotulo";
import type { CampoProps } from "./types";

/** Um campo de formulário (`.field` do artifact): rótulo, controle e dica.
 *
 * O rótulo é 12.5px/700 em `ink` -- **não** é o `Rotulo` em caixa-alta, que
 * é outra coisa (rótulo de coluna de filtro). O asterisco de obrigatório vai
 * em `bad`, como no artifact.
 */
export default function Campo({
  rotulo, para, obrigatorio, dica, erro, aposORotulo, children,
}: CampoProps) {
  return (
    <Box mb="16px" position="relative">
      <Flex align="center" mb="6px">
        <Rotulo variante="campo" id={`${para}-rotulo`} htmlFor={para}>
          {rotulo}
          {obrigatorio && (
            <Text as="span" color="status.bad" aria-hidden="true">
              {" *"}
            </Text>
          )}
        </Rotulo>
        {aposORotulo}
      </Flex>
      {children}
      {erro ? (
        <Text fontSize="11.5px" color="status.bad" mt="5px" role="alert">
          {erro}
        </Text>
      ) : (
        dica && (
          <Text fontSize="11.5px" color="fg.subtle" mt="5px">
            {dica}
          </Text>
        )
      )}
    </Box>
  );
}
