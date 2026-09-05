import type { Comunicacao } from "../../../../types";

export interface ModalDeMovimentacaoProps {
  comunicacao: Comunicacao;
  /** Leva ao e-mail que avisou desta movimentação, no Histórico. Ausente
   * quando não houve e-mail -- ver `tem_envio`. */
  onVerOEnvio?: () => void;
  /** Abre o formulário de tarefa já vinculado a este processo. */
  onAdicionarTarefa: () => void;
  onFechar: () => void;
}
