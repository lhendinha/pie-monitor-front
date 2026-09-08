import type { IntervaloDeDatas, OpcaoDeMenu } from "../../types";

export interface SeletorDePeriodoProps {
  /** Id de `PERIODOS_*`, `PERIODO_TODOS` ou `PERIODO_PERSONALIZADO`. */
  periodoId: string;
  /** Só é lido quando `periodoId` é o personalizado. */
  intervaloPersonalizado?: IntervaloDeDatas;
  /** Os blocos de opções, separados por divisória. Padrão: os do Kanban.
   *
   * 🔴 Tem padrão para o Kanban e a Agenda NÃO mudarem: elas já usavam esta
   * pílula, e o Financeiro é quem chegou depois com opções próprias. Prop
   * obrigatória obrigaria a tocar nas duas telas que estavam certas. */
  blocos?: readonly (readonly OpcaoDeMenu[])[];
  onMudar: (periodoId: string, intervalo?: IntervaloDeDatas) => void;
}
