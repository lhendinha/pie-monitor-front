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
  onEscolherDia: (iso: string) => void;
}
