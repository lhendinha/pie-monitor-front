import type { Tarefa } from "../../types";

export interface ListaDoLoteProps {
  /** As tarefas que a ação vai tocar -- as MARCADAS, na ordem da tela. */
  tarefas: Tarefa[];
}
