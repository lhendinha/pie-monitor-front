import { Flex, Stack, Text } from "@chakra-ui/react";

import { EtiquetaDeMetadado, Esqueleto, Ponto } from "../../../../components";
import { useToastOnQueryError } from "../../../../services/queryClient";
import { formatarData } from "../../../../utils";
import { useTarefasDoProcesso } from "../../hooks/useTarefasDoProcesso";

interface TarefasVinculadasProps {
  numeroProcesso: string;
}

/** As tarefas abertas neste processo.
 *
 * É a única informação da página que não está em nenhuma outra tela: a
 * listagem mostra prazos do processo, não o que alguém marcou pra fazer.
 * Depende do filtro `processo_numero` de `GET /tarefas`, criado em
 * 22/08/2026 justamente pra isto.
 */
export default function TarefasVinculadas({ numeroProcesso }: TarefasVinculadasProps) {
  const query = useTarefasDoProcesso(numeroProcesso);
  useToastOnQueryError(query.error, "Não foi possível carregar as tarefas do processo.");

  if (query.isPending) return <Esqueleto linhas={2} />;

  // 🔴 Erro não é "não tem tarefa".
  //
  // Sem este ramo, uma falha de rede deixava `data` indefinido, a lista caía
  // pra `[]` e o cartão AFIRMAVA que o processo não tem tarefa nenhuma. O
  // toast some em 4,5s; a afirmação falsa fica. Pior: o diálogo de exclusão
  // desta mesma página já trata `isError` com rigor -- a tela dizia duas
  // coisas diferentes sobre o mesmo dado.
  if (query.isError) {
    return (
      <Text fontSize="13px" color="status.bad.text">
        Não foi possível carregar as tarefas deste processo.
      </Text>
    );
  }

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
              literal). Mesmo componente das outras listas -- as duas listas
              desta página têm que ler igual. */}
          <Ponto />
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
