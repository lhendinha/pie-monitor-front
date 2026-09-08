export interface ModalDePagamentoProps {
  /** Para o título dizer de qual documento se trata. */
  numero: string;
  valorCentavos: number;
  /** As contas do escritório, para escolher onde o depósito caiu. */
  opcoesDeConta: { value: string; label: string }[];
  /** A recusa do servidor, mostrada no corpo -- ela fala de um campo que
   * está aqui ("Conta desativada: escolha outra"). */
  erro: string;
  salvando: boolean;
  onConfirmar: (dados: { pago_em: string; conta_id: string }) => void;
  onFechar: () => void;
}
