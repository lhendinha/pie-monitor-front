import type { Tarefa } from "../../../../types";

export interface VisaoPorSemanaProps {
  data: Date;
  isoDeHoje: string;
  porDia: Map<string, Tarefa[]>;
  onEscolherDia: (iso: string) => void;
}
