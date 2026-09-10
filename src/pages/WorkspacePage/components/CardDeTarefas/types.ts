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

  /** O nome deste card no escopo da seleção. A página decide qual está
   * ativo -- é o que impede os dois de selecionarem ao mesmo tempo. */
  escopo: string;
  /** O escopo LIGADO agora, vindo da página. */
  escopoAtivo: string;
  /** Entrar no modo de seleção com este card. `undefined` esconde a entrada
   * -- é assim que ela some para quem não é `manager`. */
  onSelecionar?: () => void;
  /** A barra, montada pela página com o hook.
   *
   * Recebe as tarefas da PÁGINA ATUAL (o que a caixa do topo alcança), o
   * TOTAL do filtro (o que o link "todas as N" promete) e a função que busca
   * todas -- é o card que sabe o filtro. */
  selecao?: (
    tarefas: Tarefa[],
    total: number,
    carregarTodas: () => Promise<Tarefa[]>,
  ) => ReactNode;
  /** A caixa de uma linha, no lugar do `acao`. */
  caixa?: (tarefa: Tarefa, ordem: string[]) => ReactNode;
}
