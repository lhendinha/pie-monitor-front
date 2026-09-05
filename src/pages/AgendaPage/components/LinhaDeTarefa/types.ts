import type { Tarefa } from "../../../../types";

export interface LinhaDeTarefaProps {
  tarefa: Tarefa;
  concluida: boolean;
  /** Em que coluna do quadro a tarefa está ("A Fazer", "Fazendo"…).
   *
   * A Agenda não tem colunas, então esta é a única forma de saber em que pé
   * a tarefa está sem abri-la -- e é a primeira metade do `meta` do
   * artifact. */
  nomeDaColuna?: string;
  /** Assunto do atendimento vinculado, quando houver. A tarefa guarda só o
   * id, e quem resolve o nome é a página. */
  assuntoDoAtendimento?: string;
  /** Nome do subgrupo da tarefa. Resolvido pela PÁGINA, pela mesma razão do
   * assunto acima: uma consulta para a lista inteira, não uma por linha. */
  subgrupoNome: string;
  onAbrir: (tarefa: Tarefa) => void;
  /** Última da lista não desenha a divisória de baixo. */
  ultima?: boolean;
}
