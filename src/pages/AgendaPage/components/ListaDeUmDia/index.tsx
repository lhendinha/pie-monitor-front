import { Box } from "@chakra-ui/react";

import { Cartao } from "../../../../components";
import LinhaDeTarefa from "../LinhaDeTarefa";
import { rotuloDoDia } from "../../periodoDaAgenda";
import type { ListaDeUmDiaProps } from "./types";

/** Um cartão com as tarefas de UM dia: cabeçalho com a data e as linhas.
 *
 * Usado pela visão "Por dia" (um cartão) e pela "Em lista" (um por dia com
 * tarefa). Só é montado quando há tarefa -- quem decide mostrar o vazio é a
 * visão, que sabe se o vazio é do dia ou do período inteiro.
 */
export default function ListaDeUmDia({
  data,
  tarefas,
  assuntoDoAtendimento,
  subgrupoNome,
  onAbrir,
  comData = true,
}: ListaDeUmDiaProps) {
  return (
    <Cartao titulo={comData ? rotuloDoDia(data) : undefined}>
      <Box px="16px" py="4px">
        {tarefas.map((tarefa, indice) => (
          <LinhaDeTarefa
            key={`${tarefa.subgrupo_id}:${tarefa.tarefa_id}`}
            tarefa={tarefa}
            concluida={tarefa.esta_concluida ?? false}
            nomeDaColuna={tarefa.coluna_nome ?? undefined}
            assuntoDoAtendimento={
              tarefa.atendimento_id ? assuntoDoAtendimento(tarefa.atendimento_id) : undefined
            }
            subgrupoNome={subgrupoNome(tarefa.subgrupo_id)}
            onAbrir={onAbrir}
            ultima={indice === tarefas.length - 1}
          />
        ))}
      </Box>
    </Cartao>
  );
}
