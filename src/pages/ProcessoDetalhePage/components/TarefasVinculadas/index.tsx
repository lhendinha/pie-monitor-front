import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";

import { EtiquetaDeMetadado, Esqueleto } from "../../../../components";
import { listarTarefas } from "../../../../services";
import { useToastOnQueryError } from "../../../../services/queryClient";
import { qk } from "../../../../services/queryKeys";
import { formatarData } from "../../../../utils";
import type { Tarefa } from "../../../../types";

interface Props {
  numeroProcesso: string;
}

/** As tarefas abertas neste processo.
 *
 * É a única informação da página que não está em nenhuma outra tela: a
 * listagem mostra prazos do processo, não o que alguém marcou pra fazer.
 * Depende do filtro `processo_numero` de `GET /tarefas`, criado em
 * 22/08/2026 justamente pra isto.
 */
export default function TarefasVinculadas({ numeroProcesso }: Props) {
  const query = useQuery<{ tarefas: Tarefa[] }>({
    queryKey: qk.tarefasDoProcesso(numeroProcesso),
    queryFn: () => listarTarefas({ processoNumero: numeroProcesso, tamanhoPagina: 100 }),
  });
  useToastOnQueryError(query.error, "Não foi possível carregar as tarefas do processo.");

  if (query.isPending) return <Esqueleto linhas={2} />;

  const tarefas = query.data?.tarefas || [];
  if (tarefas.length === 0) {
    return (
      <Text fontSize="13px" color="fg.subtle">
        Nenhuma tarefa vinculada a este processo.
      </Text>
    );
  }

  return (
    <Stack gap="0">
      {tarefas.map((t) => (
        <Flex key={t.tarefa_id} align="center" gap="10px" py="4px" wrap="wrap">
          {/* A bolinha antes de cada tarefa é do artifact (lá é um "•"
              literal). Aqui vira um ponto da marca, do MESMO tamanho do
              item de movimentação -- as duas listas da página têm que ler
              igual. */}
          <Box
            w="9px"
            h="9px"
            flex="0 0 auto"
            borderRadius="full"
            bg="fg.brand"
            aria-hidden="true"
          />
          <Text fontSize="13px" flex="1" minW="0">
            {t.titulo}
          </Text>
          <Flex gap="6px" flexShrink={0}>
            <EtiquetaDeMetadado>{formatarData(t.data)}</EtiquetaDeMetadado>
            <EtiquetaDeMetadado>{t.prioridade}</EtiquetaDeMetadado>
          </Flex>
        </Flex>
      ))}
    </Stack>
  );
}
