import type { ReactNode } from "react";
import type { Tarefa } from "../../../../types";
import type { FiltroDoCard } from "../../types";

export interface CardDeTarefasProps {
  titulo: string;
  /** Filtro que define o card. `responsavel: "eu"` ou
   * `semResponsavel: true` -- os dois já resolvidos no servidor. */
  filtro: FiltroDoCard;
  vazio: string;
  acao?: (tarefa: Tarefa) => ReactNode;
  responsavel?: (tarefa: Tarefa) => ReactNode;
}
