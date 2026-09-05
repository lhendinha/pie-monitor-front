import type { ColunaDoQuadro as Coluna, Tarefa } from "../../../../types";

export interface ColunaDoQuadroProps {
  coluna: Coluna;
  tarefas: Tarefa[];
  onAbrirTarefa: (tarefa: Tarefa) => void;
  onNovaTarefa: (colunaId: string) => void;
}
