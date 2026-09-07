import type { ContaFinanceira } from "../../../../types";

export interface ListaDeContasProps {
  contas: ContaFinanceira[];
  /** Para marcar qual delas é a padrão do grupo. Vazio enquanto ninguém
   * escolheu. */
  contaPadraoId: string;
  podeEscrever: boolean;
}
