import { Box, Stack, Text } from "@chakra-ui/react";
import type { EstadoVazioProps } from "./types";

/** O que aparece no lugar da lista quando não há nada (`.empty-state` do
 * artifact): 34px 10px, centralizado, texto de 13px em `slate-2`.
 *
 * Fica DENTRO do cartão, e não no lugar dele: o vazio é conteúdo da tabela,
 * não ausência de tabela.
 */
export default function EstadoVazio({ mensagem, acao }: EstadoVazioProps) {
  return (
    <Box p="34px 10px" textAlign="center">
      <Stack gap="10px" align="center">
        <Text fontSize="13px" color="fg.subtle">
          {mensagem}
        </Text>
        {acao}
      </Stack>
    </Box>
  );
}
