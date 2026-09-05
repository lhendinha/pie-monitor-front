import type { ColunaDoQuadro } from "../../../../types";

export interface LinhaDeColunaProps {
  coluna: ColunaDoQuadro;
  /** Quantas tarefas estão nela hoje -- é o número que a pessoa precisa ver
   * antes de excluir, porque elas vão pra coluna anterior. */
  tarefas: number;
  editando: boolean;
  /** Alguma ação DESTA linha está em voo. */
  emAndamento: boolean;
  /** Excluir a última coluna deixaria o quadro sem nenhuma -- o servidor
   * recusa, e a lixeira nem aparece. */
  podeExcluir: boolean;
  onIniciarRenome: () => void;
  onRenomear: (nome: string) => void;
  onCancelarRenome: () => void;
  onMarcarConclusao: () => void;
  onExcluir: () => void;
}
