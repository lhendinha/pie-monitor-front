export interface EtiquetaDePrazoProps {
  data: string;
  /** Concluída não fica vermelha, mesmo com data no passado: já foi feita,
   * e pintar de atraso o que já acabou é alarme falso. */
  concluida?: boolean;
}
