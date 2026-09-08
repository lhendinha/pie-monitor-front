import type { TotaisDeLancamentos } from "../../../../types";

export interface CartoesDeTotaisProps {
  totais: TotaisDeLancamentos;
  /** O rótulo do período escolhido, para o card dizer DE QUANDO ele fala
   * ("A receber · este mês"). Sem ele, três números sem recorte. */
  periodo: string;
  /** Clicar num card estreita a lista para aquele recorte.
   *
   * 🔴 O segundo argumento é a NATUREZA (`entrada`/`saida`), não o tipo:
   * "a receber" são honorário e entrada juntos. Ver o componente. */
  onFiltrar: (situacao: string, natureza: string) => void;
}
