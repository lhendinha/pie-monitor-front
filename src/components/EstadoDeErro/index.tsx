import { Box, Stack, Text } from "@chakra-ui/react";

import Botao from "../Botao";
import { IconeAlerta } from "../Icons";
import type { EstadoDeErroProps } from "./types";

/** O que aparece no lugar da lista quando a consulta FALHA.
 *
 * Existe porque erro e vazio eram indistinguíveis: o padrão `data?.x || []`
 * faz o render cair no caminho de sucesso com lista vazia, e o
 * `EstadoVazio` então AFIRMA que não há nada -- "Nenhum processo cadastrado
 * ainda" para quem tem duzentos. O toast que dizia a verdade some em 4,5s e
 * a mentira fica.
 *
 * Fica DENTRO do cartão, no lugar da tabela, pelo mesmo motivo do
 * `EstadoVazio`: é conteúdo da lista, não ausência dela.
 */
export default function EstadoDeErro({ mensagem, onTentarDeNovo, tentando }: EstadoDeErroProps) {
  return (
    <Box p="34px 10px" textAlign="center" role="alert">
      <Stack gap="10px" align="center">
        <Box color="status.bad" css={{ "& svg": { width: "22px", height: "22px" } }}>
          <IconeAlerta />
        </Box>
        <Text fontSize="13px" color="fg.muted" maxW="380px">
          {mensagem}
        </Text>
        <Botao variante="ghost" onClick={onTentarDeNovo} disabled={tentando}>
          {tentando ? "Tentando…" : "Tentar de novo"}
        </Botao>
      </Stack>
    </Box>
  );
}
