import type { TotaisDeLancamentos } from "../../../../types";

export interface CartoesDeTotaisProps {
  totais: TotaisDeLancamentos;
  /** O rótulo do período escolhido, para o card dizer DE QUANDO ele fala
   * ("A receber · este mês"). Sem ele, três números sem recorte. */
  periodo: string;
  /** Clicar num card estreita a lista para aquele recorte. */
  onFiltrar: (situacao: string, tipo: string) => void;
}
