import type { CatalogoFinanceiro } from "../../../../types";
import type { DadosDoLancamento } from "../../../../types/requisicoes";

export interface ModalDeEntradaOuSaidaProps {
  /** `entrada` ou `saida`. Troca o título, os rótulos e quais categorias
   * aparecem -- o resto do formulário é o mesmo. */
  natureza: string;
  catalogo?: CatalogoFinanceiro;
  salvando?: boolean;
  erro?: string;
  /** `continuar` = veio de "Salvar e adicionar outra". */
  onSalvar: (dados: DadosDoLancamento, repetir: boolean, continuar: boolean) => void;
  /** Escolheu "Honorário" no Tipo: este modal fecha e o de honorário abre.
   * Só a entrada oferece essa porta. */
  onTrocarParaHonorario?: () => void;
  onFechar: () => void;
}
