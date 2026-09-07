import type { OpcaoDeMenu } from "../../../types";

export interface ListaDeOpcoesProps {
  selecionado: string;
  /** Os blocos de opções, separados por divisória. Quem escolhe é o
   * `SeletorDePeriodo`: o Kanban usa os dele, o Financeiro os de dinheiro. */
  blocos: readonly (readonly OpcaoDeMenu[])[];
  onEscolher: (id: string) => void;
  onAbrirPersonalizado: () => void;
}
