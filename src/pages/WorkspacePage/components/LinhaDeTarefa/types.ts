import type { ReactNode } from "react";
import type { Tarefa } from "../../../../types";

export interface LinhaDeTarefaProps {
  tarefa: Tarefa;
  /** Ação à esquerda: o círculo de concluir. */
  acao?: ReactNode;
  /** O que aparece na posição do responsável, logo antes do prazo: as
   * iniciais de quem é dono, ou o avatar vazio que assume a tarefa. */
  responsavel?: ReactNode;
  /** Nome do subgrupo da tarefa. Resolvido pela PÁGINA -- uma consulta para a
   * lista inteira, não uma por linha. */
  subgrupoNome: string;
}
