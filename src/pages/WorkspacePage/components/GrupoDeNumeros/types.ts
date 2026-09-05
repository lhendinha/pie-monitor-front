import type { NumeroDoResumo } from "../../types";

export interface GrupoDeNumerosProps {
  rotulo: string;
  numeros: NumeroDoResumo[];
  /** O primeiro grupo não afasta do topo -- o cabeçalho do cartão já
   * separa. */
  primeiro?: boolean;
}
