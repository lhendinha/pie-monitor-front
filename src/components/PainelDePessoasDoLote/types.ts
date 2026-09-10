import type { Tarefa } from "../../types";

export interface PainelDePessoasDoLoteProps {
  /** As tarefas MARCADAS: é delas que sai quantas ficariam de fora por pessoa. */
  tarefas: Tarefa[];
  desabilitado?: boolean;
  /** `responsavelId` nulo é DEVOLVER ao pool; `nome` é o que o aviso vai dizer. */
  onEscolher: (responsavelId: string | null, nome: string | null) => void;
}
