import type { Tarefa } from "../../../../types";

export interface CartaoDeTarefaProps {
  tarefa: Tarefa;
  /** Apelido de quem é responsável -- a tarefa guarda só o e-mail. */
  responsavel?: string;
  onAbrir: (tarefa: Tarefa) => void;
}
