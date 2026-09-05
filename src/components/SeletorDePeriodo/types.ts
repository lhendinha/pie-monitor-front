import type { IntervaloDeDatas } from "../../types";

export interface SeletorDePeriodoProps {
  /** Id de `PERIODOS_*`, `PERIODO_TODOS` ou `PERIODO_PERSONALIZADO`. */
  periodoId: string;
  /** Só é lido quando `periodoId` é o personalizado. */
  intervaloPersonalizado?: IntervaloDeDatas;
  onMudar: (periodoId: string, intervalo?: IntervaloDeDatas) => void;
}
