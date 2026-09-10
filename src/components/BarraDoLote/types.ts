import type { ColunaDoQuadro, SelecaoDeTarefas, Tarefa } from "../../types";

export interface BarraDoLoteProps {
  selecao: SelecaoDeTarefas;
  /** TODAS as tarefas que o modo alcança -- não a página, não a coluna.
   *
   * 🔴 É deste conjunto que saem a contagem, a caixa do topo, o número de
   * vinculadas e o que vai para o lote. Um recorte diferente em qualquer um
   * deles faz a barra avisar sobre uma coisa e apagar outra. */
  universo: Tarefa[];
  /** Uma linha sobre o que o modo custa NESTA tela, quando custa algo. */
  nota?: string;
  onExcluir: (marcadas: Tarefa[]) => void;
  /** As ações reversíveis. Recebem as MARCADAS -- o mesmo conjunto que a
   * contagem mostra, pela mesma razão do `onExcluir`. */
  subgrupoNome?: (id: string) => string;
  onAtribuir?: (marcadas: Tarefa[], responsavelId: string | null, nome: string | null) => void;
  onAlterarStatus?: (marcadas: Tarefa[], coluna: ColunaDoQuadro) => void;
  onConcluir?: (marcadas: Tarefa[]) => void;
  agindo?: boolean;
  excluindo?: boolean;
}
