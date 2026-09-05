export interface BotaoDeCancelarProps {
  /** Trava o botão enquanto uma gravação está em voo. `ModalDaInscricao` já
   * fazia isso, e perder esse comportamento na migração seria regressão. */
  desabilitado?: boolean;
  /** O texto, quando "Cancelar" não serve. */
  children?: string;
}
