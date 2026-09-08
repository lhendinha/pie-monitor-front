import type { CatalogoFinanceiro } from "../../../../types";
import type { DadosDoLancamento } from "../../../../types/requisicoes";

export interface ModalDeHonorarioProps {
  catalogo?: CatalogoFinanceiro;
  salvando?: boolean;
  /** A recusa do servidor, em uma frase -- aparece no pé do formulário. */
  erro?: string;
  /** `continuar` = veio de "Salvar e adicionar outra": a página mantém o
   * formulário aberto e vazio em vez de fechá-lo. */
  onSalvar: (dados: DadosDoLancamento, parcelas: number, continuar: boolean) => void;
  onFechar: () => void;
}
