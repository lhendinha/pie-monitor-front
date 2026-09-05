import { Box, Flex, Heading } from "@chakra-ui/react";
import type { CartaoProps } from "./types";

/** Cartão de conteúdo (`.card` do artifact): superfície com borda, raio
 * `lg` e sombra `sm`. Cabeçalho e corpo têm padding próprio (16px 18px).
 *
 * Diferente do `CartaoDeTabela`, que tem padding mínimo porque quem espaça
 * lá são as células.
 */
export default function Cartao({ titulo, acoes, children }: CartaoProps) {
  return (
    <Box
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border"
      borderRadius="lg"
      boxShadow="sm"
    >
      {titulo && (
        <Flex
          align="center"
          justify="space-between"
          p="16px 18px"
          borderBottomWidth="1px"
          borderBottomColor="border.subtle"
        >
          <Heading as="h3" fontSize="14.5px" fontWeight="800">
            {titulo}
          </Heading>
          {acoes}
        </Flex>
      )}
      <Box p="16px 18px">{children}</Box>
    </Box>
  );
}
