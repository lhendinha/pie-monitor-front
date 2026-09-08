import type { CatalogoFinanceiro } from "../../../../types";
import type { DadosDaTransferencia } from "../../../../types/requisicoes";

export interface ModalDeTransferenciaProps {
  catalogo?: CatalogoFinanceiro;
  salvando?: boolean;
  erro?: string;
  onSalvar: (dados: DadosDaTransferencia, continuar: boolean) => void;
  onFechar: () => void;
}
