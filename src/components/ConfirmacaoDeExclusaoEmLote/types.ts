import type { Tarefa } from "../../types";

export interface ConfirmacaoDeExclusaoEmLoteProps {
  /** As que vão sair. É este conjunto que a frase conta e o aviso mede -- a
   * tela não pode avisar sobre um recorte e apagar outro. */
  tarefas: Tarefa[];
  /** Traduz o id do subgrupo em nome. Resolvido pela PÁGINA. */
  subgrupoNome: (id: string) => string;
  excluindo?: boolean;
  onConfirmar: () => void;
  onFechar: () => void;
}
