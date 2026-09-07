import type { ContaFinanceira } from "../../../../types";

export interface ListaDeContasProps {
  contas: ContaFinanceira[];
  /** Para marcar qual delas é a padrão do grupo. Vazio enquanto ninguém
   * escolheu. */
  contaPadraoId: string;
  podeEscrever: boolean;
  onNova: () => void;
  onEditar: (conta: ContaFinanceira) => void;
  onAlternarAtivo: (conta: ContaFinanceira) => void;
}
