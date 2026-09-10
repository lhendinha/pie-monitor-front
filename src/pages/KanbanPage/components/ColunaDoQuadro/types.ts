import type { ColunaDoQuadro as Coluna, Tarefa } from "../../../../types";

export interface ColunaDoQuadroProps {
  coluna: Coluna;
  tarefas: Tarefa[];
  onAbrirTarefa: (tarefa: Tarefa) => void;
  onNovaTarefa: (colunaId: string) => void;

  /** A seleção de uma tarefa, quando o modo está ligado. `undefined` deixa o
   * cartão como sempre foi: arrastável e clicável para abrir.
   *
   * ⚠️ Função POR TAREFA, atravessando a coluna sem que ela precise saber o
   * que é seleção -- ela só repassa. Mesmo desenho da Agenda. */
  selecaoDe?: (tarefa: Tarefa) => { marcada: boolean; onAlternar: (comShift: boolean) => void } | undefined;
}
