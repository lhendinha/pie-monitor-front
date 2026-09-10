import type { FiltrosDaAgenda as Filtros } from "../../types";
import type { Tarefa } from "../../../../types";

export interface AreaDaVisaoProps {
  filtros: Filtros;
  dataVisivel: Date;
  isoDeHoje: string;
  porDia: Map<string, Tarefa[]>;
  assuntoDoAtendimento: (id: string) => string | undefined;
  subgrupoNome: (id: string) => string;
  onAbrirTarefa: (tarefa: Tarefa) => void;
  /** A seleção de uma tarefa, quando o modo está ligado. `undefined` deixa
   * a linha como sempre foi: um botão que abre.
   *
   * ⚠️ É função POR TAREFA e atravessa as camadas sem que nenhuma delas
   * precise saber o que é seleção -- elas só repassam. */
  selecaoDe?: (tarefa: Tarefa) => { marcada: boolean; onAlternar: (comShift: boolean) => void } | undefined;
  onEscolherDia: (iso: string) => void;
}
