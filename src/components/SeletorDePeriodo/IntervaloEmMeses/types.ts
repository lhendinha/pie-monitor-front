import type { IntervaloDeDatas } from "../../../types";

export interface IntervaloEmMesesProps {
  /** Rascunho inicial, em `aaaa-mm` -- o intervalo já aplicado, se houver. */
  de: string;
  ate: string;
  onAplicar: (intervalo: IntervaloDeDatas) => void;
  onVoltar: () => void;
}
