import type { Tarefa } from "../../../../types";

export interface CaixaDaLinhaProps {
  tarefa: Tarefa;
  marcada: boolean;
  /** A ordem VISÍVEL da lista -- a âncora do Shift+clique. */
  ordem: string[];
  onAlternar: (tarefa: Tarefa, ordem: string[], comShift: boolean) => void;
}
