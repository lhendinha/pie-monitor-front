import type { Tarefa } from "../../types";

export interface ConfirmacaoDeConclusaoEmLoteProps {
  tarefas: Tarefa[];
  /** O nome de cada subgrupo: a frase nomeia para ONDE cada tarefa vai. */
  subgrupoNome: (id: string) => string;
  concluindo?: boolean;
  onConfirmar: () => void;
  onFechar: () => void;
}
