import type { ParcelaParaEnviar } from "../../../../types";

export interface CampoDeDepartamentosProps {
  id: string;
  /** As parcelas do rateio. UMA linha é o caminho comum -- e é a mesma
   * forma, não um caso especial: um departamento só é um rateio de uma
   * linha, como a API o guarda. */
  valor: ParcelaParaEnviar[];
  onMudar: (rateio: ParcelaParaEnviar[]) => void;
  /** O valor do lançamento, em centavos. É contra ele que a soma tem de
   * fechar -- `null` enquanto ninguém digitou o valor. */
  valorTotalCentavos: number | null;
}
