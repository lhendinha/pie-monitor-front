import { Box } from "@chakra-ui/react";

import { Cartao } from "../../../../components";
import LinhaDeTarefa from "../LinhaDeTarefa";
import { rotuloDoDia } from "../../helpers/periodoDaAgenda";
import type { Tarefa } from "../../../../types";

interface Props {
  data: Date;
  tarefas: Tarefa[];
  estaConcluida: (tarefa: Tarefa) => boolean;
  assuntoDoAtendimento: (id: string) => string | undefined;
  onAbrir: (tarefa: Tarefa) => void;
  /** Desenha a data no cabeçalho.
   *
   * ⚠️ DIVERGE do artifact na visão "Por dia": lá o mesmo rótulo aparece na
   * barra de datas E no cabeçalho do cartão, a 40px um do outro. Na visão em
   * lista o cabeçalho é necessário (são vários dias empilhados); na de um
   * dia só, é a mesma frase duas vezes. */
  comData?: boolean;
}

/** Um cartão com as tarefas de UM dia: cabeçalho com a data e as linhas.
 *
 * Usado pela visão "Por dia" (um cartão) e pela "Em lista" (um por dia com
 * tarefa). Só é montado quando há tarefa -- quem decide mostrar o vazio é a
 * visão, que sabe se o vazio é do dia ou do período inteiro.
 */
export default function ListaDeUmDia({
  data,
  tarefas,
  estaConcluida,
  assuntoDoAtendimento,
  onAbrir,
  comData = true,
}: Props) {
  return (
    <Cartao titulo={comData ? rotuloDoDia(data) : undefined}>
      <Box px="16px" py="4px">
        {tarefas.map((tarefa, indice) => (
          <LinhaDeTarefa
            key={`${tarefa.subgrupo_id}:${tarefa.tarefa_id}`}
            tarefa={tarefa}
            concluida={estaConcluida(tarefa)}
            assuntoDoAtendimento={
              tarefa.atendimento_id ? assuntoDoAtendimento(tarefa.atendimento_id) : undefined
            }
            onAbrir={onAbrir}
            ultima={indice === tarefas.length - 1}
          />
        ))}
      </Box>
    </Cartao>
  );
}
