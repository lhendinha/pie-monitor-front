import type { ColunaDoQuadro, Tarefa } from "../../types";

export interface PainelDeStatusDoLoteProps {
  /** As tarefas MARCADAS: decidem se o botão trava, e quantas já estão em cada coluna. */
  tarefas: Tarefa[];
  /** O nome do subgrupo, para o topo dizer DE QUAL quadro são as colunas. */
  subgrupoNome: (id: string) => string;
  /** Uma ação do lote está a caminho -- trava além do motivo próprio. */
  desabilitado?: boolean;
  onEscolher: (coluna: ColunaDoQuadro) => void;
}
