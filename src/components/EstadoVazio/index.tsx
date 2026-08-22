import { Box, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface Props {
  mensagem: string;
  /** Um botão pra sair do vazio -- "Limpar filtros", "Limpar busca". Só faz
   * sentido quando a lista está vazia POR causa de um filtro. */
  acao?: ReactNode;
}

/** O que aparece no lugar da lista quando não há nada (`.empty-state` do
 * artifact): 34px 10px, centralizado, texto de 13px em `slate-2`.
 *
 * Fica DENTRO do cartão, e não no lugar dele: o vazio é conteúdo da tabela,
 * não ausência de tabela.
 */
export default function EstadoVazio({ mensagem, acao }: Props) {
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
