import type { IntervaloDeDatas } from "../../../types";

export interface IntervaloPersonalizadoProps {
  /** Rascunho inicial -- o intervalo já aplicado, se houver. */
  de: string;
  ate: string;
  onAplicar: (intervalo: IntervaloDeDatas) => void;
  onVoltar: () => void;
}
