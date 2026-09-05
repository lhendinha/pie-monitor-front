import type { OpcaoDeMenu } from "../../types";

export interface PilulaDeMenuProps {
  opcoes: readonly OpcaoDeMenu[];
  selecionado: string;
  /** A pílula fica azul quando há filtro. Filtro ligado que parece
   * desligado faz a pessoa ver uma lista incompleta achando que vê tudo. */
  ativo: boolean;
  onEscolher: (id: string) => void;
}
